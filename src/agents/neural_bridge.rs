use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::mpsc::{self, Receiver, SyncSender, TryRecvError, TrySendError};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

use crate::agents::neural_telemetry::{log_bridge_fail, log_bridge_ok, log_bridge_timeout};

struct NeuralProcess {
    child: Child,
    stdin: ChildStdin,
    stdout_rx: Receiver<Result<String, String>>,
}

pub(crate) struct NeuralBridge {
    process: Mutex<Option<NeuralProcess>>,
}

pub(crate) struct NeuralBridgeConfig<'a> {
    pub(crate) python_exe: &'a str,
    pub(crate) script_path: &'a str,
    pub(crate) model_path: &'a str,
    pub(crate) project_root: &'a str,
}

impl NeuralBridge {
    const STDOUT_BUFFER_CAPACITY: usize = 8;
    const BRIDGE_POLL_INTERVAL: Duration = Duration::from_millis(10);

    pub(crate) fn new() -> Self {
        Self {
            process: Mutex::new(None),
        }
    }

    pub(crate) fn ensure_process_started(
        &self,
        config: &NeuralBridgeConfig<'_>,
        timing_enabled: fn() -> bool,
    ) -> Result<(), String> {
        let mut guard = self
            .process
            .lock()
            .map_err(|_| "Mutex poisoned".to_string())?;

        if guard.is_some() {
            return Ok(());
        }

        let start = Instant::now();

        println!("PYTHON_LAUNCH_MODE|script");

        println!("PYTHON_CWD|{}", config.project_root);
        println!("PYTHON_SCRIPT|{}", config.script_path);
        println!("PYTHON_MODE|non_interactive");
        println!("PYTHON_EXEC_MODE|direct_script");

        let script_path = Path::new(config.script_path);
        if !script_path.exists() {
            return Err(format!("Python script missing: {}", config.script_path));
        }
        if !script_path.is_absolute() {
            return Err(format!(
                "Python script path is not absolute: {}",
                config.script_path
            ));
        }

        let project_root = Path::new(config.project_root);
        if !project_root.exists() {
            return Err(format!(
                "Python working directory missing: {}",
                config.project_root
            ));
        }
        let python_path = Path::new(config.python_exe);
        if !python_path.is_absolute() {
            return Err(format!(
                "Python executable path is not absolute: {}",
                config.python_exe
            ));
        }

        println!("PYTHON_RUNTIME_CHECK|{}", python_path.display());

        let mut command = Command::new(python_path);
        command
            .current_dir(project_root)
            .args(["-u", config.script_path, "--serve"])
            .env_clear()
            .env("PATH", std::env::var("PATH").unwrap())
            .env("SystemRoot", std::env::var("SystemRoot").unwrap())
            .env("WINDIR", std::env::var("WINDIR").unwrap())
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .env("TCS_MODEL_PATH", config.model_path)
            .env("PYTHONUNBUFFERED", "1")
            .env("PYTHONIOENCODING", "utf-8")
            .env("PYTHONINSPECT", "0")
            .env("PYTHONNOUSERSITE", "1")
            .env("PYTHONPATH", "")
            .env("PYTHONHOME", "")
            .env("PYTHONUSERBASE", "");
        println!("PYTHON_CMD_WRAPPED|false");
        println!("PYTHON_ENV_ISOLATED|true");
        println!("PYTHON_ENV_FIXED|true");
        println!("PYTHON_CMD|{:?}", command);

        let mut child = command.spawn().map_err(|e| {
            format!(
                "Failed to start python process (python='{}', script='{}', model='{}'): {}",
                config.python_exe, config.script_path, config.model_path, e
            )
        })?;

        let mut stdin = match child.stdin.take() {
            Some(stdin) => stdin,
            None => {
                Self::kill_child(&mut child);
                return Err("Failed to capture python stdin".to_string());
            }
        };

        let stdout = match child.stdout.take() {
            Some(stdout) => stdout,
            None => {
                Self::kill_child(&mut child);
                return Err("Failed to capture python stdout".to_string());
            }
        };

        let stdout_rx = Self::spawn_stdout_reader(stdout);

        let ready_line = match Self::wait_for_bridge_line(
            &mut child,
            &stdout_rx,
            "startup",
            Self::bridge_startup_timeout(),
        ) {
            Ok(line) => line,
            Err(err) => {
                Self::shutdown_child(&mut stdin, &mut child);
                return Err(err);
            }
        };

        if ready_line.trim() != "READY" {
            let bad = ready_line.trim().to_string();
            log_bridge_fail("startup", "bad_ready_line");
            Self::shutdown_child(&mut stdin, &mut child);
            return Err(format!("Python bridge did not become ready: {}", bad));
        }

        println!("READY");

        *guard = Some(NeuralProcess {
            child,
            stdin,
            stdout_rx,
        });

        log_bridge_ok("startup");
        if timing_enabled() {
            println!("NEURAL_BRIDGE_STARTUP_MS={}", start.elapsed().as_millis());
        }

        Ok(())
    }

    pub(crate) fn query_raw(
        &self,
        config: &NeuralBridgeConfig<'_>,
        fen: &str,
        moves: &[String],
        timing_enabled: fn() -> bool,
    ) -> Result<String, String> {
        self.ensure_process_started(config, timing_enabled)?;

        let start = Instant::now();

        let mut guard = self
            .process
            .lock()
            .map_err(|_| "Mutex poisoned".to_string())?;

        let proc = guard
            .as_mut()
            .ok_or_else(|| "Python process missing after startup".to_string())?;

        let payload = format!("{}|{}", fen, moves.join("|"));
        if !payload.contains('|') {
            println!("INVALID_PAYLOAD {}", payload);
        }
        println!("BRIDGE_STATUS|sending_request");
        println!("BRIDGE_PAYLOAD|{}", payload);

        let request = format!("{}\n", payload);

        proc.stdin
            .write_all(request.as_bytes())
            .map_err(|e| format!("Failed to write to python stdin: {}", e))?;
        proc.stdin
            .flush()
            .map_err(|e| format!("Failed to flush python stdin: {}", e))?;

        let response = Self::wait_for_bridge_line(
            &mut proc.child,
            &proc.stdout_rx,
            "query",
            Self::bridge_timeout(),
        )?;

        if timing_enabled() {
            println!("NEURAL_QUERY_MS={}", start.elapsed().as_millis());
        }

        Ok(response)
    }

    pub(crate) fn drop_process(&self) {
        if let Ok(mut guard) = self.process.lock() {
            if let Some(mut proc) = guard.take() {
                Self::shutdown_child(&mut proc.stdin, &mut proc.child);
            }
        }
    }

    fn kill_child(child: &mut Child) {
        match child.try_wait() {
            Ok(Some(_)) => {}
            Ok(None) => {
                let _ = child.kill();
                let _ = child.wait();
            }
            Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }

    fn bridge_timeout() -> Duration {
        let ms = std::env::var("TCS_BRIDGE_TIMEOUT_MS")
            .ok()
            .and_then(|v| v.trim().parse::<u64>().ok())
            .unwrap_or(5_000);
        Duration::from_millis(ms.max(100))
    }

    fn bridge_startup_timeout() -> Duration {
        let ms = std::env::var("TCS_BRIDGE_STARTUP_TIMEOUT_MS")
            .ok()
            .and_then(|v| v.trim().parse::<u64>().ok())
            .unwrap_or(60_000);
        Duration::from_millis(ms.max(100))
    }

    fn shutdown_child(stdin: &mut ChildStdin, child: &mut Child) {
        let _ = writeln!(stdin, "QUIT");
        let _ = stdin.flush();
        Self::kill_child(child);
    }

    fn push_stdout_message(
        tx: &SyncSender<Result<String, String>>,
        message: Result<String, String>,
    ) -> bool {
        match tx.try_send(message) {
            Ok(()) => true,
            Err(TrySendError::Full(_)) => false,
            Err(TrySendError::Disconnected(_)) => false,
        }
    }

    fn spawn_stdout_reader(stdout: ChildStdout) -> Receiver<Result<String, String>> {
        let (tx, rx) = mpsc::sync_channel(Self::STDOUT_BUFFER_CAPACITY);

        thread::spawn(move || {
            let mut reader = BufReader::new(stdout);
            loop {
                let mut line = String::new();
                match reader.read_line(&mut line) {
                    Ok(0) => {
                        let _ =
                            Self::push_stdout_message(&tx, Err("Python stdout closed".to_string()));
                        break;
                    }
                    Ok(_) => {
                        if !Self::push_stdout_message(&tx, Ok(line)) {
                            break;
                        }
                    }
                    Err(e) => {
                        let _ = Self::push_stdout_message(
                            &tx,
                            Err(format!("Failed to read python stdout: {}", e)),
                        );
                        break;
                    }
                }
            }
        });

        rx
    }

    fn wait_for_bridge_line(
        child: &mut Child,
        stdout_rx: &Receiver<Result<String, String>>,
        phase: &str,
        timeout: Duration,
    ) -> Result<String, String> {
        let start = Instant::now();

        loop {
            match stdout_rx.try_recv() {
                Ok(Ok(line)) => return Ok(line),
                Ok(Err(err)) => {
                    log_bridge_fail(phase, "stdout_read");
                    return Err(err);
                }
                Err(TryRecvError::Disconnected) => {
                    log_bridge_fail(phase, "reader_disconnected");
                    return Err(format!(
                        "Python bridge reader disconnected during {}",
                        phase
                    ));
                }
                Err(TryRecvError::Empty) => {}
            }

            match child.try_wait() {
                Ok(Some(status)) => {
                    log_bridge_fail(phase, "child_exited");
                    return Err(format!(
                        "Python bridge process exited during {} with status {}",
                        phase, status
                    ));
                }
                Ok(None) => {}
                Err(e) => {
                    log_bridge_fail(phase, "try_wait_failed");
                    return Err(format!(
                        "Failed to poll python bridge during {}: {}",
                        phase, e
                    ));
                }
            }

            if start.elapsed() >= timeout {
                log_bridge_timeout(phase);
                return Err(format!("Python bridge {} timed out", phase));
            }

            thread::sleep(Self::BRIDGE_POLL_INTERVAL);
        }
    }
}
