"""
Capturas de verificación de AGUNSA Sentinel.

Recorre la aplicación en http://localhost:3100 (el servidor de desarrollo que
levanta el propio script si hace falta), captura todas las rutas a 1600x1000 y
ejecuta el flujo de aceptación "Simular incidente".

El script falla de forma ruidosa: cualquier error de consola en la página, o
cualquier excepción de Playwright, detiene la ejecución con código distinto de
cero.

Uso:
    python scripts/shoot.py                 # todas las capturas
    python scripts/shoot.py --only rutas    # sólo un grupo
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

BASE_URL = os.environ.get("AGUNSA_BASE_URL", "http://localhost:3100")
OUTPUT_DIR = Path(os.environ.get("AGUNSA_OUTPUT_DIR", "..")).resolve() / "output"
VIEWPORT = {"width": 1600, "height": 1000}
SHOTS = OUTPUT_DIR / "capturas"

ROUTES = [
    ("dashboard", "/dashboard"),
    ("monitoreo", "/monitoreo"),
    ("mapa", "/mapa"),
    ("incidentes", "/incidentes"),
    ("linea-de-tiempo", "/linea-de-tiempo"),
    ("analitica", "/analitica"),
    ("modernizacion", "/modernizacion"),
    ("config-camaras", "/configuracion/camaras"),
    ("config-zonas", "/configuracion/zonas"),
    ("config-reglas", "/configuracion/reglas"),
    ("config-usuarios", "/configuracion/usuarios"),
]

CONSOLE_ERRORS: list[str] = []
PAGE_ERRORS: list[str] = []


def port_is_open(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.6)
        return sock.connect_ex((host, port)) == 0


def ensure_server() -> subprocess.Popen | None:
    """Levanta el servidor de desarrollo en el puerto 3100 si no está vivo."""
    if port_is_open(3100):
        print("[shoot] el servidor ya responde en el puerto 3100")
        return None

    print("[shoot] arrancando `npm run dev -- --port 3100`")
    process = subprocess.Popen(
        ["npm", "run", "dev", "--", "--port", "3100"],
        cwd=str(Path(__file__).resolve().parent.parent),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        shell=True,
    )
    for _ in range(120):
        if port_is_open(3100):
            print("[shoot] servidor listo")
            return process
        time.sleep(1)
    process.terminate()
    raise RuntimeError("el servidor de desarrollo no respondió en el puerto 3100")


def attach_listeners(page: Page, label: str) -> None:
    def on_console(message) -> None:
        if message.type in ("error", "warning"):
            CONSOLE_ERRORS.append(f"[{label}] console.{message.type}: {message.text}")

    def on_error(error) -> None:
        PAGE_ERRORS.append(f"[{label}] pageerror: {error}")

    page.on("console", on_console)
    page.on("pageerror", on_error)


def shoot(page: Page, name: str, settle_ms: int = 900) -> Path:
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.wait_for_timeout(settle_ms)
    path = SHOTS / f"{name}.png"
    page.screenshot(path=str(path), full_page=False)
    print(f"[shoot] {path.name}")
    return path


def set_hour(page: Page, hour: float) -> None:
    """Fija la hora de la escena con el control real del mapa."""
    slider = page.locator('[data-testid="map-hour-slider"] [role="slider"]')
    slider.wait_for(state="visible")
    box = slider.bounding_box()
    assert box is not None
    track = page.locator('[data-testid="map-hour-slider"]').bounding_box()
    assert track is not None
    ratio = max(0.0, min(1.0, hour / 23.0))
    page.mouse.click(track["x"] + track["width"] * ratio, track["y"] + track["height"] / 2)
    page.wait_for_timeout(500)


def capture_routes(page: Page) -> None:
    for name, route in ROUTES:
        page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
        page.wait_for_timeout(700)
        shoot(page, f"ruta-{name}")


def capture_map(page: Page) -> None:
    # Plano 2D con conos hacia el exterior.
    page.goto(f"{BASE_URL}/mapa", wait_until="networkidle")
    page.wait_for_timeout(700)
    shoot(page, "mapa-2d-conos")

    # Vista 3D en horario diurno.
    page.locator('[data-testid="map-mode-3d"]').click()
    page.wait_for_selector('[data-testid="perimeter-map-3d-canvas"]', timeout=30_000)
    page.wait_for_timeout(1800)
    set_hour(page, 14)
    page.wait_for_timeout(1600)
    shoot(page, "mapa-3d-dia")

    # Vista 3D en horario nocturno.
    set_hour(page, 22)
    page.wait_for_timeout(1800)
    shoot(page, "mapa-3d-noche")

    # Selección de cámara: encuadre volado sobre la cámara elegida.
    page.locator('[data-testid="map-mode-2d"]').click()
    page.wait_for_timeout(700)
    page.locator('[data-testid="map-camera-C03"]').click()
    page.wait_for_timeout(500)
    page.locator('[data-testid="map-mode-3d"]').click()
    page.wait_for_selector('[data-testid="perimeter-map-3d-canvas"]', timeout=30_000)
    page.wait_for_timeout(2200)
    set_hour(page, 22)
    page.wait_for_timeout(2000)
    shoot(page, "mapa-3d-camara-seleccionada")


def capture_camera_detail(page: Page) -> None:
    page.goto(f"{BASE_URL}/monitoreo/C03", wait_until="networkidle")
    page.wait_for_timeout(1200)
    shoot(page, "camara-ficha-vivo")

    page.locator('[data-testid="camera-tab-evaluacion"]').click()
    page.wait_for_timeout(800)
    shoot(page, "camara-ficha-evaluacion")

    page.locator('[data-testid="camera-tab-especificaciones"]').click()
    page.wait_for_timeout(800)
    shoot(page, "camara-ficha-especificaciones")

    # Hoja lateral de detalle desde la cuadrícula de monitoreo.
    page.goto(f"{BASE_URL}/monitoreo", wait_until="networkidle")
    page.wait_for_timeout(1400)
    page.locator('[data-testid="camera-open-C15"]').click()
    page.wait_for_timeout(1200)
    shoot(page, "camara-detalle-sheet")


def capture_themes(page: Page) -> None:
    for theme in ("dark", "light"):
        page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle")
        page.wait_for_timeout(500)
        page.evaluate(
            "theme => localStorage.setItem('agunsa-sentinel:theme', theme)",
            theme,
        )
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(1400)
        shoot(page, f"tema-{theme}-dashboard")

        page.goto(f"{BASE_URL}/mapa", wait_until="networkidle")
        page.wait_for_timeout(600)
        page.locator('[data-testid="map-mode-3d"]').click()
        page.wait_for_selector('[data-testid="perimeter-map-3d-canvas"]', timeout=30_000)
        page.wait_for_timeout(2200)
        shoot(page, f"tema-{theme}-mapa-3d")


def extract_incident_state(page: Page) -> dict:
    page.goto(f"{BASE_URL}/incidentes", wait_until="networkidle")
    page.wait_for_timeout(1200)
    rows = page.locator("table tbody tr")
    data = []
    for index in range(rows.count()):
        row = rows.nth(index)
        cells = row.locator("td")
        values = [cells.nth(i).inner_text().strip() for i in range(min(cells.count(), 6))]
        data.append(values)
    page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle")
    page.wait_for_timeout(900)
    counter = page.locator('[data-testid="stat-incidentes-activos-value"]').inner_text()
    return {"counter": counter.strip(), "rows": data}


def determinism_check(context_factory) -> dict:
    """Dos ejecuciones limpias deben producir exactamente el mismo estado."""
    results = []
    for _ in range(2):
        context = context_factory()
        page = context.new_page()
        page.set_viewport_size(VIEWPORT)
        attach_listeners(page, "determinismo")
        results.append(extract_incident_state(page))
        context.close()
    return {
        "primera": results[0],
        "segunda": results[1],
        "identico": results[0] == results[1],
    }


def acceptance_flow(context) -> dict:
    """Flujo de aceptación del pliego, de punta a punta."""
    page = context.new_page()
    page.set_viewport_size(VIEWPORT)
    attach_listeners(page, "aceptacion")

    page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle")
    page.wait_for_timeout(1200)
    before = int(
        page.locator('[data-testid="stat-incidentes-activos-value"]').inner_text().strip()
    )
    print(f"[shoot] incidentes activos antes de simular: {before}")

    page.locator('[data-testid="simulate-incident"]').click()
    page.wait_for_timeout(700)
    page.locator('[data-testid="scenario-scn-loitering"]').click()
    page.wait_for_timeout(1600)

    url = page.url
    incident_id = url.rstrip("/").split("/")[-1]
    print(f"[shoot] incidente generado: {incident_id}")

    status_before = page.locator('[data-testid="incident-status"]').inner_text().strip()
    page.locator('[data-testid="transition-confirmado"]').click()
    page.wait_for_timeout(900)
    status_after = page.locator('[data-testid="incident-status"]').inner_text().strip()
    print(f"[shoot] estado del incidente: {status_before} -> {status_after}")

    # Recarga: el estado vive en el almacenamiento local.
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(1400)
    status_reload = page.locator('[data-testid="incident-status"]').inner_text().strip()
    print(f"[shoot] estado tras recargar: {status_reload}")

    page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle")
    page.wait_for_timeout(1200)
    after = int(
        page.locator('[data-testid="stat-incidentes-activos-value"]').inner_text().strip()
    )
    print(f"[shoot] incidentes activos después de simular: {after}")

    shoot(page, "aceptacion-dashboard-confirmado")

    result = {
        "incident_id": incident_id,
        "estado_inicial": status_before,
        "estado_tras_confirmar": status_after,
        "estado_tras_recarga": status_reload,
        "contador_antes": before,
        "contador_despues": after,
        "contador_aumento": after > before,
        "confirmado_persiste": status_reload == "Confirmado",
    }
    page.close()
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", default="all")
    parser.add_argument("--keep-output", action="store_true")
    args = parser.parse_args()

    if not args.keep_output and SHOTS.exists():
        shutil.rmtree(SHOTS)
    SHOTS.mkdir(parents=True, exist_ok=True)

    process = ensure_server()
    report: dict = {}

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(args=["--use-gl=angle", "--enable-unsafe-swiftshader"])

            def new_context():
                context = browser.new_context(viewport=VIEWPORT, locale="es-ES")
                context.add_init_script(
                    "window.localStorage.clear();"
                )
                return context

            if args.only in ("all", "rutas"):
                context = new_context()
                page = context.new_page()
                attach_listeners(page, "rutas")
                capture_routes(page)
                context.close()

            if args.only in ("all", "mapa"):
                context = new_context()
                page = context.new_page()
                attach_listeners(page, "mapa")
                capture_map(page)
                context.close()

            if args.only in ("all", "camara"):
                context = new_context()
                page = context.new_page()
                attach_listeners(page, "camara")
                capture_camera_detail(page)
                context.close()

            if args.only in ("all", "temas"):
                context = new_context()
                page = context.new_page()
                attach_listeners(page, "temas")
                capture_themes(page)
                context.close()

            if args.only in ("all", "aceptacion"):
                context = new_context()
                report["aceptacion"] = acceptance_flow(context)
                context.close()

            if args.only in ("all", "determinismo"):
                report["determinismo"] = determinism_check(new_context)

            browser.close()
    finally:
        if process is not None:
            process.terminate()

    report["consola"] = CONSOLE_ERRORS
    report["excepciones"] = PAGE_ERRORS
    (OUTPUT_DIR / "verificacion.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print("\n=== Resumen de verificación ===")
    print(json.dumps(report.get("aceptacion", {}), indent=2, ensure_ascii=False))
    determinismo = report.get("determinismo")
    if determinismo:
        print("determinismo idéntico:", determinismo["identico"])

    if CONSOLE_ERRORS:
        print("\n!!! errores de consola:")
        for error in CONSOLE_ERRORS:
            print("   ", error)
    if PAGE_ERRORS:
        print("\n!!! excepciones de página:")
        for error in PAGE_ERRORS:
            print("   ", error)

    acceptance = report.get("aceptacion")
    if acceptance:
        if not acceptance["contador_aumento"]:
            print("\n!!! el contador de incidentes no aumentó")
            return 1
        if not acceptance["confirmado_persiste"]:
            print("\n!!! el estado Confirmado no sobrevivió a la recarga")
            return 1

    determinismo = report.get("determinismo")
    if determinismo and not determinismo["identico"]:
        print("\n!!! la ejecución no fue determinista")
        return 1

    if CONSOLE_ERRORS or PAGE_ERRORS:
        return 1

    print("\n[shoot] verificación superada")
    return 0


if __name__ == "__main__":
    sys.exit(main())
