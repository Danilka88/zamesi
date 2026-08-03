// [M-EXTENSION][BACKGROUND][START_BLOCK]
// Service worker MV3. Демо-расширение не требует фоновой логики;
// провайдер реальных данных (RealDataProvider) сможет вызывать FastAPI
// /analyze c этого контекста. Пока — пустой обработчик для корректного старта.
chrome.runtime.onInstalled.addListener(() => {
  // eslint-disable-next-line no-console
  console.log("[RUTUBE Замеси] installed");
});
// [M-EXTENSION][BACKGROUND][END_BLOCK]