use std::env;
use std::path::{Path, PathBuf};

pub(crate) fn resolve_python_exe() -> String {
    let python_path = env::var("TCS_PYTHON_EXE")
        .ok()
        .map(|value| value.trim().trim_matches('"').to_string())
        .filter(|v| !v.is_empty())
        .unwrap_or_else(|| python_fallback_path(&resolve_project_root_buf_for_python_fallback()));

    println!("PYTHON_SELECTED|{}", python_path);

    if !Path::new(&python_path).exists() {
        println!("PYTHON_PATH_INVALID|{}", python_path);
        panic!("Python executable missing: {}", python_path);
    }

    python_path
}

pub(crate) fn resolve_script_path() -> String {
    let project_root = resolve_project_root_buf();
    let script_from_env = env::var("TCS_NEURAL_SCRIPT").ok();
    resolve_script_path_from_env(&project_root, script_from_env.as_deref())
        .to_string_lossy()
        .to_string()
}

pub(crate) fn resolve_project_root() -> String {
    resolve_project_root_buf().to_string_lossy().to_string()
}

pub(crate) fn resolve_model_path() -> String {
    let model_from_env = env::var("TCS_MODEL_PATH").ok();
    resolve_model_path_from_env(model_from_env.as_deref())
}

pub(crate) fn env_flag(name: &str, default: bool) -> bool {
    env::var(name)
        .ok()
        .map(|v| parse_env_flag(&v))
        .unwrap_or(default)
}

pub(crate) fn env_f32(name: &str, default: f32) -> f32 {
    env::var(name)
        .ok()
        .and_then(|v| v.trim().parse::<f32>().ok())
        .unwrap_or(default)
}

pub(crate) fn env_usize(name: &str, default: usize) -> usize {
    env::var(name)
        .ok()
        .and_then(|v| v.trim().parse::<usize>().ok())
        .unwrap_or(default)
}

fn resolve_project_root_buf() -> PathBuf {
    let exe_path = env::current_exe().unwrap_or_else(|e| {
        panic!("Failed to resolve executable path for project root fallback: {e}");
    });
    project_root_from_exe_path(&exe_path)
}

fn resolve_project_root_buf_for_python_fallback() -> PathBuf {
    let exe_path = env::current_exe().unwrap_or_else(|e| {
        panic!("Failed to resolve executable path for python fallback: {e}");
    });
    project_root_from_exe_path(&exe_path)
}

fn project_root_from_exe_path(exe_path: &Path) -> PathBuf {
    exe_path
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .to_path_buf()
}

fn python_fallback_path(project_root: &Path) -> String {
    let mut candidate_paths = Vec::new();

    for venv_dir in [".venv312", ".venv", ".python312", ".venv312.venv312"] {
        let candidate = project_root
            .join(venv_dir)
            .join("Scripts")
            .join("python.exe");
        candidate_paths.push(candidate);
    }

    candidate_paths.push(project_root.join(".python312").join("python.exe"));
    candidate_paths.push(project_root.join(".venv312").join("python.exe"));

    if let Some(user_profile) = env::var_os("USERPROFILE") {
        let home = Path::new(&user_profile);
        candidate_paths.push(
            home.join("AppData")
                .join("Local")
                .join("Programs")
                .join("Python")
                .join("Python312")
                .join("python.exe"),
        );
        candidate_paths.push(
            home.join("AppData")
                .join("Local")
                .join("Programs")
                .join("Python")
                .join("Python311")
                .join("python.exe"),
        );
        candidate_paths.push(
            home.join("AppData")
                .join("Roaming")
                .join("Python")
                .join("Python312")
                .join("python.exe"),
        );
    }

    if let Some(local_app_data) = env::var_os("LOCALAPPDATA") {
        let root = Path::new(&local_app_data);
        candidate_paths.push(
            root.join("Programs")
                .join("Python")
                .join("Python312")
                .join("python.exe"),
        );
        candidate_paths.push(
            root.join("Programs")
                .join("Python")
                .join("Python39")
                .join("python.exe"),
        );
    }

    if let Some(program_files) = env::var_os("ProgramFiles") {
        let root = Path::new(&program_files);
        candidate_paths.push(root.join("Python312").join("python.exe"));
        candidate_paths.push(root.join("Python").join("Python312").join("python.exe"));
    }

    if let Some(program_files_x86) = env::var_os("ProgramFiles(x86)") {
        let root = Path::new(&program_files_x86);
        candidate_paths.push(root.join("Python312").join("python.exe"));
        candidate_paths.push(root.join("Python").join("Python312").join("python.exe"));
    }

    if let Some(path) = candidate_paths
        .into_iter()
        .find(|candidate| candidate.exists())
    {
        return path.to_string_lossy().to_string();
    }

    "C:\\Python312\\python.exe".to_string()
}

fn resolve_script_path_from_env(project_root: &Path, script_from_env: Option<&str>) -> PathBuf {
    let script_from_env = script_from_env
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());

    match script_from_env {
        Some(s) => {
            let p = Path::new(&s);
            if p.is_absolute() {
                Path::new(&s).to_path_buf()
            } else {
                project_root.join(p)
            }
        }
        None => project_root.join("ml").join("infer_policy.py"),
    }
}

fn resolve_model_path_from_env(model_from_env: Option<&str>) -> String {
    model_from_env
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .unwrap_or_else(|| "models/latest.pt".to_string())
}

fn parse_env_flag(value: &str) -> bool {
    let v = value.trim().to_ascii_lowercase();
    v == "1" || v == "true" || v == "yes" || v == "on"
}

#[cfg(test)]
mod tests {
    use super::{
        parse_env_flag, project_root_from_exe_path, resolve_model_path_from_env,
        resolve_script_path_from_env,
    };
    use std::path::PathBuf;

    #[test]
    fn neural_config_project_root_from_exe_matches_existing_parent_walk() {
        let exe = PathBuf::from("repo")
            .join("target")
            .join("debug")
            .join("tactical_chess_pure_lab.exe");

        assert_eq!(project_root_from_exe_path(&exe), PathBuf::from("repo"));
    }

    #[test]
    fn neural_config_script_path_defaults_to_ml_infer_policy() {
        let root = PathBuf::from("repo");

        assert_eq!(
            resolve_script_path_from_env(&root, None),
            root.join("ml").join("infer_policy.py")
        );
        assert_eq!(
            resolve_script_path_from_env(&root, Some("")),
            root.join("ml").join("infer_policy.py")
        );
    }

    #[test]
    fn neural_config_script_path_keeps_relative_env_under_project_root() {
        let root = PathBuf::from("repo");

        assert_eq!(
            resolve_script_path_from_env(&root, Some(" tools/infer.py ")),
            root.join("tools").join("infer.py")
        );
    }

    #[test]
    fn neural_config_model_path_preserves_existing_default_and_trim() {
        assert_eq!(resolve_model_path_from_env(None), "models/latest.pt");
        assert_eq!(resolve_model_path_from_env(Some("")), "models/latest.pt");
        assert_eq!(
            resolve_model_path_from_env(Some(" models/policy.pt ")),
            "models/policy.pt"
        );
    }

    #[test]
    fn neural_config_env_flag_matches_existing_truthy_set() {
        for value in ["1", "true", "yes", "on", " TRUE "] {
            assert!(parse_env_flag(value));
        }

        for value in ["0", "false", "no", "off", "maybe"] {
            assert!(!parse_env_flag(value));
        }
    }
}
