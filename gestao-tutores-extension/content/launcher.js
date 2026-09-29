(() => {
  "use strict";

  if (document.querySelector("#gestao-tutores-launcher")) return;

  const button = document.createElement("button");
  button.id = "gestao-tutores-launcher";
  button.type = "button";
  button.textContent = "Gestão de Tutores";
  button.setAttribute("aria-label", "Abrir painel de Gestão de Tutores");
  button.style.cssText = [
    "position:fixed",
    "right:18px",
    "bottom:18px",
    "z-index:2147483646",
    "border:0",
    "border-radius:12px",
    "padding:12px 16px",
    "font:600 14px Arial,Helvetica,sans-serif",
    "background:#005ca9",
    "color:#fff",
    "box-shadow:0 8px 24px rgba(0,0,0,.22)",
    "cursor:pointer"
  ].join(";");

  button.addEventListener("mouseenter", () => {
    button.style.transform = "translateY(-1px)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.transform = "translateY(0)";
  });

  button.addEventListener("click", async () => {
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = "Abrindo...";

    try {
      await chrome.storage.local.set({ gestaoTutoresLastOrigin: location.origin });
      const response = await chrome.runtime.sendMessage({ type: "GESTAO_TUTORES_OPEN_DASHBOARD" });
      if (!response?.ok) throw new Error(response?.error || "Não foi possível abrir o painel.");
    } catch (error) {
      console.error("Gestão de Tutores", error);
      button.textContent = "Falha ao abrir";
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 1800);
      return;
    }

    button.textContent = originalText;
    button.disabled = false;
  });

  document.documentElement.appendChild(button);
})();
