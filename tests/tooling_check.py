"""Operational document check. Run after `lovable auth-session --json --self`.

Creates only synthetic fixtures under /tmp/browser/tooling; verifies real UI
reads/writes as the requesting user, then deletes only IDs created by this run.
Requires the sandbox's preinstalled Playwright, Pillow and python-docx.
"""
import asyncio
import json
import os
from pathlib import Path

from docx import Document
from PIL import Image, ImageDraw, ImageFont
from playwright.async_api import async_playwright

ROOT = Path("/tmp/browser/tooling")
ROOT.mkdir(parents=True, exist_ok=True)
ROWS = [("Ahmed", "2026-01-01", "125.50"), ("Salem", "2026-02-01", "200.25"), ("Nora", "2026-03-01", "74.25")]


def create_inputs():
    doc = Document()
    table = doc.add_table(rows=1, cols=3)
    for cell, text in zip(table.rows[0].cells, ["Customer", "Date", "Sales"]):
        cell.text = text
    for row in ROWS:
        for cell, text in zip(table.add_row().cells, row):
            cell.text = text
    doc.save(ROOT / "tooling-verification.docx")
    image = Image.new("RGB", (1400, 600), "white")
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
    for y, row in enumerate([("Customer", "Date", "Sales"), *ROWS]):
        for x, text in zip([50, 530, 1050], row):
            draw.text((x, 40 + y * 110), text, font=font, fill="black")
    image.save(ROOT / "tooling-verification.png")
    image.convert("RGB").save(ROOT / "tooling-scanned.pdf", "PDF", resolution=140)


async def main():
    create_inputs()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        with open(os.path.expanduser("~/.cache/lovable-auth/session.json")) as handle:
            minted = json.load(handle)
        if minted.get("cookies"):
            await context.add_cookies([{**cookie, "url": "http://localhost:8080"} for cookie in minted["cookies"]])
        await page.goto("http://localhost:8080")
        await page.evaluate("([k,v]) => localStorage.setItem(k,v)", [minted["storage_key"], json.dumps(minted["session"])])
        report = await context.new_page()
        await report.set_content('<html><body style="font:18px Arial"><table style="width:600px;text-align:left"><tr><th>Customer</th><th>Date</th><th>Sales</th></tr>' +
                                "".join("<tr>" + "".join(f"<td>{value}</td>" for value in row) + "</tr>" for row in ROWS) + "</table></body></html>")
        await report.pdf(path=str(ROOT / "tooling-verification.pdf"))
        await report.close()
        created = []
        try:
            for name in ["tooling-verification.docx", "tooling-verification.pdf", "tooling-verification.png", "tooling-scanned.pdf"]:
                await page.goto("http://localhost:8080/analyze")
                await page.get_by_role("button", name="اضغط لاختيار الملف").wait_for()
                await page.wait_for_timeout(3000)
                await page.set_input_files('input[type=file]', str(ROOT / name))
                await page.get_by_role("button", name="اعتماد الجدول وتحليله").wait_for(timeout=180000)
                review = page.get_by_role("region", name="مراجعة القراءة")
                assert await review.locator("tbody tr").count() == 3
                assert "Customer" in await review.locator("thead").inner_text()
                for amount in ["125.50", "200.25", "74.25"]:
                    assert amount in await review.locator("tbody").inner_text(), name
                await review.screenshot(path=str(ROOT / f"{name}.review.png"))
                await page.get_by_role("button", name="اعتماد الجدول وتحليله").click()
                await page.wait_for_url("**/analyses/*", timeout=45000)
                created.append(page.url.rsplit("/", 1)[-1])
                await page.get_by_role("heading", name=name, exact=True).wait_for()
                await page.get_by_role("button", name="المصدر والتحقق", exact=True).click()
                source = page.get_by_role("region", name="سجل المصدر والتحقق")
                assert "مطابق" in await source.inner_text()
                assert await source.locator("tbody tr").count() == 1
                assert "400" in await source.locator("tbody").inner_text()
                await source.screenshot(path=str(ROOT / f"{name}.source.png"))
                await page.get_by_role("button", name="البيانات", exact=True).click()
                for amount in ["125.50", "200.25", "74.25"]:
                    assert amount in await page.locator("main").inner_text()
                await page.locator("main").screenshot(path=str(ROOT / f"{name}.saved.png"))
                print(f"VERIFIED: {name}: 3 rows, 3 columns, all amounts preserved, saved and read back")
            await page.set_viewport_size({"width": 390, "height": 844})
            await page.goto("http://localhost:8080/analyze")
            await page.wait_for_timeout(3000)
            await page.set_input_files('input[type=file]', str(ROOT / "tooling-verification.docx"))
            await page.get_by_role("button", name="اعتماد الجدول وتحليله").wait_for(timeout=45000)
            assert not await page.evaluate("document.documentElement.scrollWidth > innerWidth")
            await page.screenshot(path=str(ROOT / "mobile.png"))
            print("VERIFIED: mobile preview has no page overflow")
            assert not errors, errors
            print("VERIFIED: no browser page errors")
        finally:
            # Caller-scoped client and exact generated IDs; never delete by filename.
            if created:
                result = await page.evaluate("""async ids => {
                    const {supabase} = await import('/src/integrations/supabase/client.ts');
                    const {error} = await supabase.from('analyses').delete().in('id',ids);
                    return {ok: !error};
                }""", created)
                print("Test-only analysis cleanup:", result["ok"])
            await browser.close()


asyncio.run(main())