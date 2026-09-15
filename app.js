(() => {
  "use strict";

  const CONFIG = window.ALTEZ_SHARE_CONFIG || {};
  const qs = new URLSearchParams(window.location.search);
  const DEMO = qs.get("demo") === "1" || window.parent === window;

  const state = {
    API: null,
    token: null,
    project: null,
    user: null,
    models: [],
    sharing: false
  };

  const el = (id) => document.getElementById(id);

  const $ = {
    contextText: el("contextText"),
    loadedCount: el("loadedCount"),
    statusCard: el("statusCard"),
    statusIcon: el("statusIcon"),
    statusTitle: el("statusTitle"),
    statusMessage: el("statusMessage"),

    refreshBtn: el("refreshBtn"),
    openShareBtn: el("openShareBtn"),

    modalBackdrop: el("modalBackdrop"),
    closeModalBtn: el("closeModalBtn"),
    cancelBtn: el("cancelBtn"),
    modalProject: el("modalProject"),

    modelList: el("modelList"),
    toggleAllBtn: el("toggleAllBtn"),

    shareMode: el("shareMode"),
    emailInput: el("emailInput"),
    noteInput: el("noteInput"),
    expiryInput: el("expiryInput"),
    accessSelect: el("accessSelect"),
    latestVersionInput: el("latestVersionInput"),

    shareBtn: el("shareBtn"),

    validationBox: el("validationBox"),
    apiErrorBox: el("apiErrorBox"),
    apiErrorText: el("apiErrorText"),
    apiErrorDetails: el("apiErrorDetails"),

    resultBackdrop: el("resultBackdrop"),
    shareLinkOutput: el("shareLinkOutput"),
    copyBtn: el("copyBtn"),
    doneBtn: el("doneBtn"),
    mailResult: el("mailResult")
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindEvents();
    setDefaults();

    if (DEMO) {
      loadDemoData();
      renderHome();

      showStatus(
        "Demo-modus",
        "Je bekijkt de interface zonder een echte Trimble-share aan te maken.",
        "i"
      );

      return;
    }

    await connectWorkspace();
  }

  function bindEvents() {
    $.refreshBtn.addEventListener("click", refreshContext);
    $.openShareBtn.addEventListener("click", openShareDialog);
    $.closeModalBtn.addEventListener("click", closeShareDialog);
    $.cancelBtn.addEventListener("click", closeShareDialog);
    $.toggleAllBtn.addEventListener("click", toggleAllModels);
    $.shareBtn.addEventListener("click", submitShare);
    $.copyBtn.addEventListener("click", copyShareLink);

    $.doneBtn.addEventListener("click", () => {
      $.resultBackdrop.hidden = true;
    });

    $.modalBackdrop.addEventListener("click", (e) => {
      if (e.target === $.modalBackdrop) {
        closeShareDialog();
      }
    });
  }

  function setDefaults() {
    $.expiryInput.value = formatDateForInput(
      addMonths(
        new Date(),
        CONFIG.defaultExpiryMonths || 2
      )
    );

    $.accessSelect.value =
      CONFIG.defaultPermission || "VIEW";

    $.latestVersionInput.checked =
      Boolean(CONFIG.defaultUseLatestVersion);
  }

  function loadDemoData() {
    state.project = {
      id: "demo-project",
      name: "ALTEZ Demo Project",
      location: "europe"
    };

    state.user = {
      email: "jouw.naam@altez.be",
      firstName: "Demo",
      lastName: "Gebruiker"
    };

    state.models = [
      {
        modelId: "m1",
        fileId: "f1",
        versionId: "v17",
        name: "Architectuur.ifc",
        state: "loaded",
        isLatestVersion: true
      },
      {
        modelId: "m2",
        fileId: "f2",
        versionId: "v08",
        name: "Staalconstructie.ifc",
        state: "loaded",
        isLatestVersion: false
      },
      {
        modelId: "m3",
        fileId: "f3",
        versionId: "v04",
        name: "Prefab beton.ifc",
        state: "loaded",
        isLatestVersion: true
      }
    ];

    $.emailInput.value = state.user.email;
  }

  async function connectWorkspace() {
    try {
      showStatus(
        "Verbinden",
        "Verbinding maken met Trimble Connect...",
        "…"
      );

      state.API =
        await window.TrimbleConnectWorkspace.connect(
          window.parent,
          onWorkspaceEvent,
          30000
        );

      await refreshContext();

    } catch (error) {
      console.error(error);

      showStatus(
        "Geen verbinding",
        humanError(error),
        "!"
      );

      $.contextText.textContent =
        "Open deze extensie vanuit een Trimble Connect 3D Viewer.";
    }
  }

  function onWorkspaceEvent(event, args) {
    if (event === "extension.accessToken") {
      const value =
        args &&
        Object.prototype.hasOwnProperty.call(args, "data")
          ? args.data
          : args;

      if (
        typeof value === "string" &&
        value !== "pending" &&
        value !== "denied"
      ) {
        state.token = value;
      }
    }
  }

  async function refreshContext() {
    if (DEMO) {
      renderHome();
      return;
    }

    if (!state.API) {
      return;
    }

    $.refreshBtn.disabled = true;
    $.openShareBtn.disabled = true;

    try {
      const [
        project,
        user,
        models
      ] = await Promise.all([
        state.API.project.getProject(),
        state.API.user.getUser(),
        state.API.viewer.getModels()
      ]);

      state.project = project;
      state.user = user;

      const loaded = (models || []).filter(
        (m) =>
          String(m.state || "").toLowerCase() === "loaded"
      );

      const resolved =
        await Promise.all(
          loaded.map(resolveLoadedModel)
        );

      state.models =
        resolved.filter(Boolean);

      if (
        !$.emailInput.value &&
        user &&
        user.email
      ) {
        $.emailInput.value = user.email;
      }

      renderHome();
      hideStatus();

    } catch (error) {
      console.error(error);

      showStatus(
        "Laden mislukt",
        humanError(error),
        "!"
      );

    } finally {
      $.refreshBtn.disabled = false;
    }
  }

  async function resolveLoadedModel(model) {
    try {
      const file =
        await state.API.viewer.getLoadedModel(
          model.id
        );

      return {
        modelId: model.id,

        fileId:
          (file && file.id) ||
          model.id,

        versionId:
          (file && file.versionId) ||
          model.versionId,

        name:
          model.name ||
          (file && file.name) ||
          model.id,

        state:
          model.state,

        isLatestVersion:
          model.isLatestVersion
      };

    } catch (error) {
      console.warn(
        "getLoadedModel failed; ModelSpec fallback wordt gebruikt",
        model,
        error
      );

      return {
        modelId: model.id,

        fileId:
          model.id,

        versionId:
          model.versionId,

        name:
          model.name ||
          model.id,

        state:
          model.state,

        isLatestVersion:
          model.isLatestVersion
      };
    }
  }

  function renderHome() {
    const count = state.models.length;

    $.loadedCount.textContent =
      String(count);

    $.contextText.textContent =
      state.project
        ? `${
            state.project.name ||
            "Trimble Connect project"
          } · ${count} geladen model${
            count === 1 ? "" : "len"
          }`
        : `${count} geladen model${
            count === 1 ? "" : "len"
          }`;

    $.openShareBtn.disabled =
      count === 0;
  }

  function openShareDialog() {
    clearDialogMessages();
    setDefaults();

    if (
      state.user &&
      state.user.email
    ) {
      $.emailInput.value =
        state.user.email;
    }

    $.modalProject.textContent =
      state.project
        ? state.project.name || ""
        : "";

    renderModelList();

    $.modalBackdrop.hidden = false;
  }

  function closeShareDialog() {
    if (state.sharing) {
      return;
    }

    $.modalBackdrop.hidden = true;
  }

  function renderModelList() {
    $.modelList.innerHTML = "";

    state.models.forEach(
      (model, index) => {
        const row =
          document.createElement("label");

        row.className = "model-row";

        row.innerHTML = `
          <input
            type="checkbox"
            class="model-check"
            data-index="${index}"
            checked
          >

          <span>
            <div class="model-name"></div>
            <div class="model-meta"></div>
          </span>
        `;

        row.querySelector(
          ".model-name"
        ).textContent =
          model.name;

        row.querySelector(
          ".model-meta"
        ).textContent =
          `Versie: ${
            model.versionId ||
            "onbekend"
          }${
            model.isLatestVersion === false
              ? " · niet de laatste versie"
              : ""
          }`;

        $.modelList.appendChild(row);
      }
    );

    updateToggleAllLabel();

    $.modelList
      .querySelectorAll(".model-check")
      .forEach((cb) =>
        cb.addEventListener(
          "change",
          updateToggleAllLabel
        )
      );
  }

  function toggleAllModels() {
    const boxes =
      Array.from(
        $.modelList.querySelectorAll(
          ".model-check"
        )
      );

    const allChecked =
      boxes.length &&
      boxes.every(
        (b) => b.checked
      );

    boxes.forEach((b) => {
      b.checked = !allChecked;
    });

    updateToggleAllLabel();
  }

  function updateToggleAllLabel() {
    const boxes =
      Array.from(
        $.modelList.querySelectorAll(
          ".model-check"
        )
      );

    const allChecked =
      boxes.length &&
      boxes.every(
        (b) => b.checked
      );

    $.toggleAllBtn.textContent =
      allChecked
        ? "Alles deselecteren"
        : "Alles selecteren";
  }

  function selectedModels() {
    return Array.from(
      $.modelList.querySelectorAll(
        ".model-check:checked"
      )
    )
      .map(
        (cb) =>
          state.models[
            Number(cb.dataset.index)
          ]
      )
      .filter(Boolean);
  }

  function validateForm() {
    const errors = [];

    const models =
      selectedModels();

    const email =
      $.emailInput.value.trim();

    const expiry =
      $.expiryInput.value;

    if (!models.length) {
      errors.push(
        "Selecteer minstens één model."
      );
    }

    if (
      !email ||
      !isValidEmail(email)
    ) {
      errors.push(
        "Vul een geldig e-mailadres in."
      );
    }

    if (!expiry) {
      errors.push(
        "Kies een vervaldatum."
      );
    }

    if (
      expiry &&
      new Date(
        `${expiry}T23:59:59`
      ) <= new Date()
    ) {
      errors.push(
        "De vervaldatum moet in de toekomst liggen."
      );
    }

    return errors;
  }

  async function submitShare() {
    clearDialogMessages();

    const errors =
      validateForm();

    if (errors.length) {
      $.validationBox.hidden =
        false;

      $.validationBox.innerHTML =
        errors
          .map(
            (x) =>
              `<div>• ${escapeHtml(
                x
              )}</div>`
          )
          .join("");

      return;
    }

    const models =
      selectedModels();

    const email =
      $.emailInput.value.trim();

    const expiry =
      $.expiryInput.value;

    const permission =
      $.accessSelect.value;

    const useLatestVersion =
      $.latestVersionInput.checked;

    const note =
      $.noteInput.value.trim();

    setSharing(true);

    try {
      let result;

      if (DEMO) {
        await sleep(650);

        result = {
          id: "demo-share-id",
          url:
            "https://web.connect.trimble.com/demo/share?stoken=DEMO-ALTEZ-DATA-DELEN"
        };

      } else {
        const token =
          await getAccessToken();

        if (!token) {
          throw new Error(
            "Geen Trimble access token ontvangen. Geef de extensie toestemming voor API-toegang."
          );
        }

        const payload =
          buildSharePayload({
            models,
            email,
            expiry,
            permission,
            useLatestVersion,
            note
          });

        console.log(
          "ALTEZ Share request",
          payload
        );

        result =
          await createShare(
            token,
            payload
          );
      }

      const shareUrl =
        extractShareUrl(result);

      if (!shareUrl) {
        throw new Error(
          "Trimble heeft de share aangemaakt, maar er werd geen bruikbare share-koppeling teruggegeven."
        );
      }

      $.modalBackdrop.hidden =
        true;

      $.shareLinkOutput.value =
        shareUrl;

      $.mailResult.textContent =
        DEMO
          ? `Demo: in de echte extensie wordt de Trimble-deelmail naar ${email} gestuurd.`
          : `Trimble heeft de deelmail aangevraagd voor ${email}.`;

      $.resultBackdrop.hidden =
        false;

    } catch (error) {
      console.error(
        "Share error",
        error
      );

      $.apiErrorBox.hidden =
        false;

      $.apiErrorText.textContent =
        humanError(error);

      $.apiErrorDetails.textContent =
        technicalError(error);

    } finally {
      setSharing(false);
    }
  }

  /*
   * Exacte payload zoals de native
   * Trimble Connect Share Data-functie.
   */
  function buildSharePayload({
    models,
    email,
    expiry,
    permission,
    useLatestVersion,
    note
  }) {
    return {
      message:
        note || "",

      mode:
        "PUBLIC",

      notify: [
        {
          id:
            email,

          type:
            "EMAIL"
        }
      ],

      objects:
        models.map(
          (model) => ({
            id:
              model.fileId,

            type:
              "FILE",

            useLatestVersion:
              Boolean(
                useLatestVersion
              )
          })
        ),

      permission:
        permission,

      projectId:
        state.project.id,

      expiryDate:
        dateInputToTrimbleExpiry(
          expiry
        )
    };
  }

  async function createShare(
    token,
    payload
  ) {
    const apiBase =
      String(
        CONFIG.coreApiBase ||
        "https://app.connect.trimble.com/tc/api/2.0"
      ).replace(
        /\/$/,
        ""
      );

    const response =
      await fetch(
        `${apiBase}/shares`,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              payload
            )
        }
      );

    const raw =
      await response.text();

    let body = null;

    try {
      body =
        raw
          ? JSON.parse(raw)
          : null;
    } catch (_) {
      body = raw;
    }

    if (!response.ok) {
      const error =
        new Error(
          extractServerMessage(
            body
          ) ||
          `Trimble Shares API gaf HTTP ${response.status}.`
        );

      error.status =
        response.status;

      error.responseBody =
        body;

      error.requestPayload =
        payload;

      throw error;
    }

    console.log(
      "ALTEZ Share response",
      body
    );

    return body;
  }

  async function getAccessToken() {
    if (state.token) {
      return state.token;
    }

    const result =
      await state.API.extension.requestPermission(
        "accesstoken"
      );

    if (
      typeof result === "string" &&
      result !== "pending" &&
      result !== "denied"
    ) {
      state.token =
        result;

      return result;
    }

    if (
      result === "denied"
    ) {
      throw new Error(
        "Toegang tot de Trimble access token is geweigerd. Pas de extensierechten aan in Trimble Connect."
      );
    }

    if (
      result === "pending"
    ) {
      showStatus(
        "Toestemming nodig",
        "Bevestig in Trimble Connect dat deze extensie de access token mag gebruiken en klik daarna opnieuw op Delen.",
        "i"
      );

      throw new Error(
        "Toestemming voor API-toegang is nog niet bevestigd."
      );
    }

    return null;
  }

  function extractShareUrl(result) {
    if (!result) {
      return "";
    }

    const direct =
      result.url ||
      result.link ||
      result.shareUrl;

    if (direct) {
      return direct;
    }

    if (
      Array.isArray(
        result.objects
      )
    ) {
      const found =
        result.objects.find(
          (o) =>
            o &&
            o.url
        );

      if (found) {
        return found.url;
      }
    }

    const token =
      result.stoken ||
      result.sToken ||
      result.token;

    if (
      token &&
      state.project &&
      state.project.id
    ) {
      return (
        "https://web.connect.trimble.com/projects/" +
        encodeURIComponent(
          state.project.id
        ) +
        "/viewer/3d/?stoken=" +
        encodeURIComponent(
          token
        )
      );
    }

    return "";
  }

  async function copyShareLink() {
    const value =
      $.shareLinkOutput.value;

    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        value
      );

      const previous =
        $.copyBtn.textContent;

      $.copyBtn.textContent =
        "Gekopieerd";

      setTimeout(
        () => {
          $.copyBtn.textContent =
            previous;
        },
        1500
      );

    } catch (_) {
      $.shareLinkOutput.select();

      document.execCommand(
        "copy"
      );
    }
  }

  function setSharing(active) {
    state.sharing =
      active;

    $.shareBtn.disabled =
      active;

    $.cancelBtn.disabled =
      active;

    $.closeModalBtn.disabled =
      active;

    $.shareBtn.innerHTML =
      active
        ? '<span class="spinner"></span>Delen...'
        : "Delen";
  }

  function showStatus(
    title,
    message,
    icon
  ) {
    $.statusTitle.textContent =
      title;

    $.statusMessage.textContent =
      message;

    $.statusIcon.textContent =
      icon || "i";

    $.statusCard.hidden =
      false;
  }

  function hideStatus() {
    $.statusCard.hidden =
      true;
  }

  function clearDialogMessages() {
    $.validationBox.hidden =
      true;

    $.apiErrorBox.hidden =
      true;
  }

  function extractServerMessage(
    body
  ) {
    if (!body) {
      return "";
    }

    if (
      typeof body === "string"
    ) {
      return body;
    }

    return (
      body.message ||
      body.error_description ||
      body.error ||
      body.detail ||
      ""
    );
  }

  function humanError(error) {
    return (
      error &&
      error.message
    )
      ? error.message
      : String(
          error ||
          "Onbekende fout"
        );
  }

  function technicalError(error) {
    const safe = {
      message:
        humanError(error),

      status:
        error &&
        error.status,

      responseBody:
        error &&
        error.responseBody,

      requestPayload:
        error &&
        error.requestPayload
    };

    return JSON.stringify(
      safe,
      null,
      2
    );
  }

  function addMonths(
    date,
    months
  ) {
    const d =
      new Date(
        date.getTime()
      );

    const targetMonth =
      d.getMonth() +
      months;

    const day =
      d.getDate();

    d.setDate(1);

    d.setMonth(
      targetMonth
    );

    const lastDay =
      new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0
      ).getDate();

    d.setDate(
      Math.min(
        day,
        lastDay
      )
    );

    return d;
  }

  function formatDateForInput(
    date
  ) {
    const y =
      date.getFullYear();

    const m =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const d =
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      );

    return `${y}-${m}-${d}`;
  }

  /*
   * Trimble gebruikt bijvoorbeeld:
   *
   * 2026-11-16T23:59:59+0100
   *
   * en dus NIET:
   *
   * 2026-11-16T22:59:59.000Z
   */
  function dateInputToTrimbleExpiry(
    value
  ) {
    const parts =
      value.split("-");

    const year =
      Number(parts[0]);

    const month =
      Number(parts[1]);

    const day =
      Number(parts[2]);

    const date =
      new Date(
        year,
        month - 1,
        day,
        23,
        59,
        59,
        0
      );

    const offsetMinutes =
      -date.getTimezoneOffset();

    const sign =
      offsetMinutes >= 0
        ? "+"
        : "-";

    const absolute =
      Math.abs(
        offsetMinutes
      );

    const hours =
      String(
        Math.floor(
          absolute / 60
        )
      ).padStart(
        2,
        "0"
      );

    const minutes =
      String(
        absolute % 60
      ).padStart(
        2,
        "0"
      );

    const y =
      date.getFullYear();

    const m =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const d =
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      );

    return (
      `${y}-${m}-${d}` +
      `T23:59:59` +
      `${sign}${hours}${minutes}`
    );
  }

  function isValidEmail(
    value
  ) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value
    );
  }

  function sleep(ms) {
    return new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          ms
        )
    );
  }

  function escapeHtml(
    value
  ) {
    return String(
      value
    ).replace(
      /[&<>'"]/g,
      (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      }[c])
    );
  }

})();
