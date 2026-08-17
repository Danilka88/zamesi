// [M-EXTENSION][TEST-STUDIO-FIXTURE][START_BLOCK]
// Фрагмент реальной модалки video-editor (studio.rutube.ru) для тестов селекторов
// и рендера. Классы хэшированы — упрощены, но атрибуты (name/testid/data-control-name)
// сохранены как в оригинальном HTML из ТЗ.
export function buildStudioModalFixture(): HTMLElement {
  const modal = document.createElement("div");
  modal.setAttribute("role", "dialog");
  modal.setAttribute("data-testid", "video-editor-layout");
  modal.style.position = "fixed";

  const form = document.createElement("form");
  form.id = "69a58c40-781f-4e18-96c7-7690f55cfb71";

  const left = document.createElement("div");
  left.className = "leftSide";

  const titleLabel = document.createElement("label");
  titleLabel.textContent = "Название";
  const title = document.createElement("input");
  title.setAttribute("name", "title");
  title.value = "Тестовое видео";
  titleLabel.append(title);

  const descLabel = document.createElement("label");
  descLabel.textContent = "Описание";
  const desc = document.createElement("textarea");
  desc.setAttribute("name", "description");
  desc.setAttribute("placeholder", "Расскажите, о чём ваше видео, и добавьте тайм-коды фрагментов");
  descLabel.append(desc);

  const cat = document.createElement("div");
  cat.setAttribute("data-control-name", "category");
  const catInput = document.createElement("input");
  catInput.type = "text";
  catInput.setAttribute("placeholder", "Выберите категорию");
  cat.append(catInput);

  const access = document.createElement("input");
  access.type = "hidden";
  access.setAttribute("name", "access");
  access.value = "publish";

  const playlistsHidden = document.createElement("input");
  playlistsHidden.type = "hidden";
  playlistsHidden.setAttribute("name", "playlists");

  const playlistsCtrl = document.createElement("div");
  playlistsCtrl.setAttribute("data-control-name", "playlists");
  const playlistSearch = document.createElement("input");
  playlistSearch.type = "text";
  playlistSearch.setAttribute("placeholder", "Найти плейлист");
  playlistsCtrl.append(playlistSearch);

  const now = document.createElement("input");
  now.type = "radio";
  now.value = "now";
  now.checked = true;
  const delayed = document.createElement("input");
  delayed.type = "radio";
  delayed.value = "delayed";

  const disclaimers = document.createElement("input");
  disclaimers.type = "hidden";
  disclaimers.setAttribute("name", "disclaimers");
  disclaimers.value = "86bda998-e8ed-46a6-995e-3048a56ec893,b8e98256-ee0d-49d4-bb1d-f8284d91f673";

  const isAdult = document.createElement("input");
  isAdult.type = "checkbox";
  isAdult.setAttribute("name", "isAdult");
  const withComments = document.createElement("input");
  withComments.type = "checkbox";
  withComments.setAttribute("name", "withComments");
  withComments.checked = true;

  left.append(titleLabel, descLabel, cat, access, playlistsHidden, playlistsCtrl, now, delayed, disclaimers, isAdult, withComments);
  form.append(left);

  const footer = document.createElement("div");
  footer.className = "modalFooter";
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.setAttribute("form", form.id);
  submit.textContent = "Опубликовать";
  footer.append(submit);

  modal.append(form, footer);
  return modal;
}
// = [M-EXTENSION][TEST-STUDIO-FIXTURE][END_BLOCK]