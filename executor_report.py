"""executor_report.py — IMP report analysis utilities."""


def analyse_report(report: dict) -> bool:
    """Return True if the IMP can be closed, False otherwise.

    An IMP is closeable when:
    - software_verdict is "OK"
    - evidence_verdict is "MECHANICAL_VALIDATION_ONLY"
    - claim_verdict is "NO_CLAIM_ALLOWED"
    """
    if not isinstance(report, dict):
        return False

    return (
        report.get("software_verdict") == "OK"
        and report.get("evidence_verdict") == "MECHANICAL_VALIDATION_ONLY"
        and report.get("claim_verdict") == "NO_CLAIM_ALLOWED"
    )
