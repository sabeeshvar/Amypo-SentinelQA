import os
import sys
import subprocess
import webbrowser
import time

def main():
    print("=" * 70)
    print("      VERIQUERY - Offline Local Database QA & AI Hallucination Detector")
    print("          HackWithAMYPO 2026: Merged Problem Statements PS7 & PS2")
    print("=" * 70)
    print("[1] Backend: FastAPI (Python 3.10+)")
    print("[2] Local Vector Store: ChromaDB + SentenceTransformers (all-MiniLM-L6-v2)")
    print("[3] Hallucination Engine: CPU Cross-Encoder NLI (nli-deberta-v3-small)")
    print("[4] Local Database Engine: SQLite Tabular QA Engine")
    print("[5] Zero Third-Party API Keys Mandate: 100% Enforced")
    print("=" * 70)

    # Set python path
    backend_dir = os.path.join(os.path.dirname(__file__), "backend")
    sys.path.insert(0, backend_dir)

    # Launch Uvicorn
    print("\n[VeriQuery] Starting FastAPI Server on http://127.0.0.1:8000 ...")
    print("[VeriQuery] Opening Web Dashboard at http://127.0.0.1:8000 ...\n")
    
    # Auto-open browser after 1.5s
    def open_browser():
        time.sleep(1.5)
        webbrowser.open("http://127.0.0.1:8000")

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    import uvicorn
    from app.main import app
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

if __name__ == "__main__":
    main()
