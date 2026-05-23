import json
import traceback
from datetime import datetime, timezone
from pathlib import Path
from tkinter import BOTH, END, LEFT, RIGHT, VERTICAL, X, Y, messagebox, ttk
import tkinter as tk
from typing import Any, Dict, List, Optional

from lab_orchestrator import doctor as run_doctor


REPO_ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = REPO_ROOT / "lab" / "state" / "lab_registry.json"
EXPERIMENTS_DIR = REPO_ROOT / "lab" / "experiments"
CANONICAL_EXPERIMENT_STATUSES = [
    "validated",
    "rejected",
    "active",
    "failed",
    "smoke",
    "archived",
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_json(path: Path) -> Optional[Dict[str, Any]]:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def save_json(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def iter_experiments(registry: Dict[str, Any]) -> List[Dict[str, Any]]:
    experiments = registry.get("experiments", [])
    if isinstance(experiments, dict):
        rows = []
        for experiment_id, entry in experiments.items():
            item = dict(entry)
            item["experiment_id"] = item.get("experiment_id") or experiment_id
            rows.append(item)
        return rows
    if isinstance(experiments, list):
        return [dict(item) for item in experiments if isinstance(item, dict)]
    return []


def load_registry() -> Dict[str, Any]:
    registry = load_json(REGISTRY_PATH)
    if registry is None:
        return {
            "updated_at": None,
            "active_experiment_id": None,
            "active_baseline_experiment": None,
            "active_baseline_baby": None,
            "active_official_dataset": None,
            "latest_run": None,
            "latest_failed_run": None,
            "structural_alerts": [],
            "experiments": [],
        }
    return registry


def format_json(value: Any) -> str:
    if value is None:
        return "-"
    return json.dumps(value, indent=2, ensure_ascii=True)


def short_text(value: Any) -> str:
    if value is None:
        return "-"
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=True)
    return str(value)


class LabControlUI:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("TacticalChessPureLab Control")
        self.root.geometry("1280x860")

        self.registry: Dict[str, Any] = {}
        self.experiments: List[Dict[str, Any]] = []
        self.selected_experiment_id: Optional[str] = None
        self.doctor_cache: Optional[Dict[str, Any]] = None

        self.info_vars = {
            "baseline": tk.StringVar(value="-"),
            "dataset": tk.StringVar(value="-"),
            "experiment": tk.StringVar(value="-"),
            "latest_run": tk.StringVar(value="-"),
            "latest_failed_run": tk.StringVar(value="-"),
            "alerts": tk.StringVar(value="0"),
        }
        self.status_var = tk.StringVar(value=CANONICAL_EXPERIMENT_STATUSES[0])
        self.path_var = tk.StringVar(value="-")
        self.report_var = tk.StringVar(value="-")
        self.checkpoint_var = tk.StringVar(value="-")

        self._build_ui()
        self.refresh()

    def _build_ui(self) -> None:
        outer = ttk.Frame(self.root, padding=12)
        outer.pack(fill=BOTH, expand=True)

        top = ttk.Frame(outer)
        top.pack(fill=X)

        ttk.Button(top, text="Save", command=self.save_registry).pack(side=LEFT, padx=(0, 8))
        ttk.Button(top, text="Refresh", command=self.refresh).pack(side=LEFT, padx=(0, 8))
        ttk.Button(top, text="Run Doctor", command=self.run_doctor).pack(side=LEFT, padx=(0, 8))
        ttk.Button(top, text="Copy Report", command=self.copy_report).pack(side=LEFT)

        summary = ttk.LabelFrame(outer, text="Active Lab State", padding=10)
        summary.pack(fill=X, pady=(12, 12))

        self._summary_row(summary, 0, "Active baseline", self.info_vars["baseline"])
        self._summary_row(summary, 1, "Active dataset", self.info_vars["dataset"])
        self._summary_row(summary, 2, "Active experiment", self.info_vars["experiment"])
        self._summary_row(summary, 3, "Latest run", self.info_vars["latest_run"])
        self._summary_row(summary, 4, "Latest failed run", self.info_vars["latest_failed_run"])
        self._summary_row(summary, 5, "Structural alerts", self.info_vars["alerts"])

        body = ttk.Panedwindow(outer, orient=tk.HORIZONTAL)
        body.pack(fill=BOTH, expand=True)

        left = ttk.Frame(body, padding=(0, 0, 12, 0))
        right = ttk.Frame(body)
        body.add(left, weight=3)
        body.add(right, weight=4)

        experiments_box = ttk.LabelFrame(left, text="Experiments", padding=8)
        experiments_box.pack(fill=BOTH, expand=True)

        self.experiments_tree = ttk.Treeview(
            experiments_box,
            columns=("status", "updated", "report"),
            show="headings",
            height=14,
        )
        self.experiments_tree.heading("status", text="Status")
        self.experiments_tree.heading("updated", text="Updated")
        self.experiments_tree.heading("report", text="Report")
        self.experiments_tree.column("status", width=110, anchor=tk.W)
        self.experiments_tree.column("updated", width=180, anchor=tk.W)
        self.experiments_tree.column("report", width=90, anchor=tk.CENTER)
        self.experiments_tree.pack(side=LEFT, fill=BOTH, expand=True)
        self.experiments_tree.bind("<<TreeviewSelect>>", self.on_select_experiment)

        tree_scroll = ttk.Scrollbar(experiments_box, orient=VERTICAL, command=self.experiments_tree.yview)
        tree_scroll.pack(side=RIGHT, fill=Y)
        self.experiments_tree.configure(yscrollcommand=tree_scroll.set)

        details = ttk.LabelFrame(left, text="Selected Experiment", padding=8)
        details.pack(fill=X, pady=(12, 0))

        ttk.Label(details, text="Experiment status").grid(row=0, column=0, sticky="w")
        self.status_combo = ttk.Combobox(
            details,
            textvariable=self.status_var,
            values=CANONICAL_EXPERIMENT_STATUSES,
            state="readonly",
            width=20,
        )
        self.status_combo.grid(row=0, column=1, sticky="ew", padx=(8, 0))

        ttk.Label(details, text="Path").grid(row=1, column=0, sticky="w", pady=(8, 0))
        ttk.Label(details, textvariable=self.path_var, wraplength=420, justify=LEFT).grid(
            row=1, column=1, sticky="w", padx=(8, 0), pady=(8, 0)
        )

        ttk.Label(details, text="Report").grid(row=2, column=0, sticky="w", pady=(8, 0))
        ttk.Label(details, textvariable=self.report_var, wraplength=420, justify=LEFT).grid(
            row=2, column=1, sticky="w", padx=(8, 0), pady=(8, 0)
        )

        ttk.Label(details, text="Checkpoint").grid(row=3, column=0, sticky="w", pady=(8, 0))
        ttk.Label(details, textvariable=self.checkpoint_var, wraplength=420, justify=LEFT).grid(
            row=3, column=1, sticky="w", padx=(8, 0), pady=(8, 0)
        )
        details.columnconfigure(1, weight=1)

        doctor_box = ttk.LabelFrame(right, text="Doctor Output", padding=8)
        doctor_box.pack(fill=BOTH, expand=True)

        self.doctor_text = tk.Text(doctor_box, wrap="word", height=18)
        self.doctor_text.pack(side=LEFT, fill=BOTH, expand=True)
        doctor_scroll = ttk.Scrollbar(doctor_box, orient=VERTICAL, command=self.doctor_text.yview)
        doctor_scroll.pack(side=RIGHT, fill=Y)
        self.doctor_text.configure(yscrollcommand=doctor_scroll.set)

    def _summary_row(self, parent: ttk.LabelFrame, row: int, label: str, variable: tk.StringVar) -> None:
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", pady=2)
        ttk.Label(parent, textvariable=variable, wraplength=980, justify=LEFT).grid(
            row=row, column=1, sticky="w", padx=(12, 0), pady=2
        )

    def refresh(self) -> None:
        try:
            self.registry = load_registry()
            self.experiments = iter_experiments(self.registry)
            self._populate_summary()
            self._populate_experiments()
            self._show_doctor_text(self.registry.get("structural_alerts", []), from_registry=True)
        except Exception as exc:
            messagebox.showerror("Refresh failed", f"{exc}\n\n{traceback.format_exc()}")

    def _populate_summary(self) -> None:
        self.info_vars["baseline"].set(
            f"{short_text(self.registry.get('active_baseline_experiment'))} / "
            f"{short_text(self.registry.get('active_baseline_baby'))}"
        )
        self.info_vars["dataset"].set(short_text(self.registry.get("active_official_dataset")))
        self.info_vars["experiment"].set(short_text(self.registry.get("active_experiment_id")))
        self.info_vars["latest_run"].set(short_text(self.registry.get("latest_run")))
        self.info_vars["latest_failed_run"].set(short_text(self.registry.get("latest_failed_run")))
        self.info_vars["alerts"].set(str(len(self.registry.get("structural_alerts", []))))

    def _populate_experiments(self) -> None:
        for item in self.experiments_tree.get_children():
            self.experiments_tree.delete(item)

        selected_iid = None
        for experiment in self.experiments:
            iid = experiment["experiment_id"]
            report_exists = "yes" if Path(experiment.get("report_path", "")).exists() else "no"
            self.experiments_tree.insert(
                "",
                END,
                iid=iid,
                text=iid,
                values=(
                    experiment.get("status", "-"),
                    experiment.get("updated_at", "-"),
                    report_exists,
                ),
            )
            if self.selected_experiment_id == iid:
                selected_iid = iid

        if selected_iid is None and self.experiments:
            selected_iid = self.registry.get("active_experiment_id") or self.experiments[0]["experiment_id"]

        if selected_iid:
            self.experiments_tree.selection_set(selected_iid)
            self.experiments_tree.focus(selected_iid)
            self._load_selected_experiment(selected_iid)

    def _find_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        for experiment in self.experiments:
            if experiment.get("experiment_id") == experiment_id:
                return experiment
        return None

    def on_select_experiment(self, _event: object) -> None:
        selection = self.experiments_tree.selection()
        if not selection:
            return
        self._load_selected_experiment(selection[0])

    def _load_selected_experiment(self, experiment_id: str) -> None:
        experiment = self._find_experiment(experiment_id)
        if experiment is None:
            return
        self.selected_experiment_id = experiment_id
        self.status_var.set(experiment.get("status", "active"))
        self.path_var.set(short_text(experiment.get("path")))
        self.report_var.set(short_text(experiment.get("report_path")))
        self.checkpoint_var.set(short_text(experiment.get("checkpoint_path")))

    def save_registry(self) -> None:
        if not self.selected_experiment_id:
            messagebox.showwarning("No experiment selected", "Select an experiment before saving.")
            return

        selected_status = self.status_var.get().strip()
        if selected_status not in CANONICAL_EXPERIMENT_STATUSES:
            messagebox.showerror("Invalid status", f"Unsupported canonical status: {selected_status}")
            return

        registry = load_registry()
        updated = False
        experiments = registry.get("experiments", [])
        if isinstance(experiments, list):
            for experiment in experiments:
                if experiment.get("experiment_id") == self.selected_experiment_id:
                    experiment["status"] = selected_status
                    experiment["updated_at"] = utc_now_iso()
                    updated = True
                    break

        if not updated:
            messagebox.showerror("Save failed", f"Experiment not found in registry: {self.selected_experiment_id}")
            return

        registry["updated_at"] = utc_now_iso()
        save_json(REGISTRY_PATH, registry)
        self.refresh()
        messagebox.showinfo("Registry saved", f"Updated status for {self.selected_experiment_id}.")

    def run_doctor(self) -> None:
        try:
            self.doctor_cache = run_doctor()
            self._show_doctor_report(self.doctor_cache)
        except Exception as exc:
            messagebox.showerror("Doctor failed", f"{exc}\n\n{traceback.format_exc()}")

    def _show_doctor_text(self, alerts: List[Dict[str, Any]], from_registry: bool) -> None:
        self.doctor_text.delete("1.0", END)
        header = "Doctor output from registry alerts\n" if from_registry else "Doctor output\n"
        self.doctor_text.insert(END, header)
        self.doctor_text.insert(END, "=" * (len(header) - 1) + "\n\n")
        if not alerts:
            self.doctor_text.insert(END, "No structural problems detected.\n")
            return
        for alert in alerts:
            scope = alert.get("experiment_id") or "-"
            if alert.get("baby_id"):
                scope = f"{scope}/{alert['baby_id']}"
            self.doctor_text.insert(
                END,
                f"[{alert.get('level', 'warning').upper()}] {alert.get('kind', 'unknown')} :: "
                f"{scope}\n{alert.get('message', '')}\n\n",
            )

    def _show_doctor_report(self, report: Dict[str, Any]) -> None:
        self.doctor_text.delete("1.0", END)
        self.doctor_text.insert(END, "TACTICAL CHESS PURE LAB DOCTOR\n")
        self.doctor_text.insert(END, "==============================\n\n")
        self.doctor_text.insert(END, f"OK: {report.get('ok')}\n")
        self.doctor_text.insert(END, f"Updated: {report.get('updated_at')}\n")
        self.doctor_text.insert(END, f"Active experiment: {report.get('active_experiment_id')}\n")
        self.doctor_text.insert(END, f"Active baseline: {report.get('active_baseline_experiment')}\n")
        self.doctor_text.insert(END, f"Active baseline baby: {report.get('active_baseline_baby')}\n")
        self.doctor_text.insert(END, f"Active official dataset: {report.get('active_official_dataset')}\n")
        self.doctor_text.insert(END, f"Experiments: {report.get('experiment_count')}\n")
        self.doctor_text.insert(END, f"Babies: {report.get('baby_count')}\n")
        self.doctor_text.insert(
            END,
            "Severity counts: "
            f"errors={report.get('severity_counts', {}).get('error', 0)} "
            f"warnings={report.get('severity_counts', {}).get('warning', 0)}\n\n",
        )

        alerts = report.get("structural_alerts", [])
        if not alerts:
            self.doctor_text.insert(END, "No structural problems detected.\n")
            return

        for alert in alerts:
            scope = alert.get("experiment_id") or "-"
            if alert.get("baby_id"):
                scope = f"{scope}/{alert['baby_id']}"
            self.doctor_text.insert(
                END,
                f"[{alert.get('level', 'warning').upper()}] "
                f"{alert.get('kind', 'unknown')} :: {scope}\n"
                f"{alert.get('message', '')}\n\n",
            )

    def copy_report(self) -> None:
        experiment_id = self.selected_experiment_id or self.registry.get("active_experiment_id")
        if not experiment_id:
            messagebox.showwarning("No experiment", "No active or selected experiment available.")
            return

        report_txt = EXPERIMENTS_DIR / experiment_id / "report.txt"
        report_json = EXPERIMENTS_DIR / experiment_id / "report.json"

        content = None
        if report_txt.exists():
            content = report_txt.read_text(encoding="utf-8")
        elif report_json.exists():
            content = report_json.read_text(encoding="utf-8")

        if not content:
            messagebox.showwarning("Missing report", f"No report found for {experiment_id}.")
            return

        self.root.clipboard_clear()
        self.root.clipboard_append(content)
        self.root.update()
        messagebox.showinfo("Report copied", f"Copied report for {experiment_id} to clipboard.")


def main() -> None:
    root = tk.Tk()
    app = LabControlUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
