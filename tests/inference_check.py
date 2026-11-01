"""Signed-in semantic approval/save/readback and held-out arithmetic evidence.
Run after lovable auth-session --json --self. Synthetic input, exact-ID cleanup.
"""
import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path("/tmp/browser/inference")

async def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    rows = ["A,B,صافي القيمة المحلي"]
    for i in range(18):
        a, b = i - 2, i % 5 + 2
        rows.append(f"{a},{b},{999 if i == 2 else a + b}")
    source = ROOT / "inference-verification.csv"
    source.write_text("\n".join(rows), encoding="utf-8")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        if os.environ.get("LOVABLE_BROWSER_AUTH_STATUS") == "injected":
            storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
            session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
            cookies = json.loads(os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON") or "[]")
        else:
            with open(os.path.expanduser("~/.cache/lovable-auth/session.json")) as handle:
                minted = json.load(handle)
            storage_key, session_json = minted["storage_key"], json.dumps(minted["session"])
            cookies = minted.get("cookies") or []
        if cookies:
            await context.add_cookies([{**cookie, "url": "http://localhost:8080"} for cookie in cookies])
        await page.goto("http://localhost:8080")
        await page.evaluate("([k,v]) => localStorage.setItem(k,v)", [storage_key, session_json])
        created = []
        try:
            await page.goto("http://localhost:8080/analyze")
            await page.get_by_role("button", name="اضغط لاختيار الملف").wait_for()
            await page.wait_for_timeout(2000)
            await page.set_input_files("input[type=file]", str(source))
            review = page.get_by_role("region", name="مراجعة معاني الأعمدة")
            await review.wait_for()
            assert await page.get_by_label("معنى صافي القيمة المحلي", exact=True).input_value() == "keep"
            await page.get_by_label("معنى صافي القيمة المحلي", exact=True).select_option("netAmount")
            assert "اعتمدته" in await review.inner_text()
            await page.screenshot(path=str(ROOT / "approval-desktop.png"))
            await page.set_viewport_size({"width": 390, "height": 844})
            assert not await page.evaluate("document.documentElement.scrollWidth > innerWidth")
            await page.screenshot(path=str(ROOT / "approval-mobile.png"))
            await page.get_by_role("button", name="اعتماد الجدول وتحليله").click()
            await page.wait_for_url("**/analyses/*", timeout=45000)
            created.append(page.url.rsplit("/", 1)[-1])
            await page.reload()
            await page.get_by_role("button", name="المصدر والتحقق", exact=True).click()
            meanings = page.get_by_role("region", name="المعاني المحفوظة")
            assert "netAmount" in await meanings.inner_text()
            assert "باعتمادك" in await meanings.inner_text()
            relationship = page.get_by_role("region", name="العلاقات الحسابية")
            target = relationship.locator("details").filter(has_text="صافي القيمة المحلي = A + B")
            assert await target.count() == 1
            await target.locator("summary").click()
            assert "توجد اختلافات" in await target.inner_text()
            assert "السطر 4: المقروء 999" in await target.inner_text()
            await page.set_viewport_size({"width": 1280, "height": 1800})
            await relationship.screenshot(path=str(ROOT / "saved-relationships.png"))
            assert not errors, errors
            print("VERIFIED: ordinary CSV review, explicit netAmount approval, save and reload retain decision")
            print("VERIFIED: discovery fit exposes held-out row 4 actual 999; no automatic financial meaning")
            print("VERIFIED: mobile review no page overflow; no browser page errors")
        finally:
            if created:
                ok = await page.evaluate("""async ids => {
                    const {supabase} = await import('/src/integrations/supabase/client.ts');
                    const {error} = await supabase.from('analyses').delete().in('id',ids);
                    return !error;
                }""", created)
                print("Test-only analysis cleanup:", ok)
            await browser.close()

asyncio.run(main())