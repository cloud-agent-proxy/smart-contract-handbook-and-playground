**2026-10-22 執行環境與憑證 hotfix**

專案：`smart-contract-handbook-and-playground`。分支：`hotfix/20261022-runtime-security-from-main`。基底：`origin/main`，commit `63013724ff5bd2c7dc5cedf9c67659d4ecfb53ec`。

[檢視完整差異](https://github.com/cloud-agent-proxy/smart-contract-handbook-and-playground/compare/main...hotfix%2F20261022-runtime-security-from-main)。此分支針對該基底的程式與部署路徑修補，供選擇合併來源。

**問題與修補範圍。** PHP2Shell（CVE-2026-109618、CVE-2026-109619）是 PHP runtime 漏洞；此基底未發現第一方 PHP runtime。這次有實際使用路徑的項目是 Node.js 2026-10 安全更新，以及 eMudhra CA 事件涉及的 Python／Go／cloudflared。這些項目分別修補，不把它們推定為同一條已證實的供應鏈入侵。

**修補前後。**

| 檔案或路徑 | 修補前 | 修補後 |
|---|---|---|
| Node.js baseline | 未鎖定修補小版本，或使用舊 Node 支線 | 22.23.4；允許支線均有明確修補下限 |
| package.json | engines.node=未指定 | engines.node=>=22.23.4 <23 \|\| >=24.22.1 <25 \|\| >=26.12.1 <27；安裝時拒絕未修補 runtime |
| Python bootstrap | 舊 pip 自帶 CA 信任；無統一安全安裝入口 | SHA256 驗證 pip 26.2.2 bootstrap；certifi >=2026.10.19；--check 驗證實際 CA bundle |

**執行與相容性影響。** 更新前端/開發工具的 Node 安裝門檻及 Python 工具安裝入口；保留現有應用與教材內容。

Node 的 security checker 與安裝 hook 會拒絕未修補、停止支援或預覽版本。鎖定的第三方 npm 套件版本不因這個門檻重新解析；package-lock 僅同步第一方 engines／install-hook metadata。

Python 新增 certifi 下限；原先未鎖版的 Python／全域 CLI 依賴在重新建置時仍依既有規則解析。

**驗證紀錄。** 以下列出實際執行結果；FAIL／BASELINE FAILURE、PENDING 與未列出的檢查不視為通過。GitHub Actions 頁面顯示推送後的驗證狀態。

| 檢查 | 結果 | 範圍與說明 |
|---|---|---|
| Node runtime positive/negative checks | PASS | 22.23.4 accepted; host 24.15.0 rejected |
| Python CA positive/negative checks | PASS | pip 26.2.2 / certifi 2026.10.19 accepted and emSign G3 absent from certifi + pip bundles; old host packages rejected |
| Node advisory boundary regression tests | PASS | Explicit node:test entrypoint; 14 advisory boundary cases; avoids Vitest/Jest discovery |
| npm ci --no-audit --no-fund | PASS | .; 80.8 sec |
| npm run build | PASS | .; 9.4 sec |

**合併後的套用方式。** 先選擇合適基底的 hotfix；兩個分支是替代方案，應依正式線的實際架構處理差異。更新開發與 CI runtime 後，保留 lockfile 重新安裝並建置。容器服務需重建、更新部署 digest、重新建立容器，再於實際容器核對版本；既有執行中服務與舊映像不會因 Git 合併自動更新。

```sh
node --version
node scripts/security/check-node-runtime.cjs
node --test scripts/security/verify-node-runtime.cjs
```

在該專案實際使用的 venv／interpreter 執行：

```sh
python scripts/security/bootstrap-python.py
python scripts/security/bootstrap-python.py --check
```

**回復與部署界線。** 回復應使用已修補 runtime 重新建置的前一版應用；不要把原有未修補映像當作安全回復點。若外部端點因 CA 更新而驗證失敗，修正其憑證鏈，不停用 TLS 驗證。本次未合併主／開發分支，也未將 hotfix 映像部署至既有服務。

**官方依據。** [PHP 公告](https://www.php.net/archive/2026.php#2026-10-21-5)、[Node.js 2026-10 安全更新](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)、[Python pip／certifi 修補指引](https://discuss.python.org/t/information-for-python-users-regarding-emudhra-emsign-ca-certificate-security-incident/109576)、[Go 1.26.10／1.27.3](https://groups.google.com/g/golang-announce/c/66pojueaQek)、[Cloudflare 憑證事件與 cloudflared 2026.10.2](https://blog.cloudflare.com/emudhra-certificate-compromise/)。
