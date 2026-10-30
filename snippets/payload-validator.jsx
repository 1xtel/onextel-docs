// Payload validator for the API reference. Runs entirely in the reader's browser: nothing is sent.
// Mintlify snippets must use arrow functions; hooks are provided by the platform.

const PV_DOC = {
  sms: "/api-reference/sms/send-sms-omni",
  smsErr: "/api-reference/sms/error-codes",
  intl: "/api-reference/sms-international/send-sms",
  waT: "/api-reference/whatsapp/send-template-message",
  waS: "/api-reference/whatsapp/send-session-messages",
  rcsT: "/api-reference/rcs/send-template-message",
  rcsM: "/api-reference/rcs/send-messages",
};

const PV_LABEL = {
  sms: "SMS, India", intl: "SMS, international", "wa-template": "WhatsApp template",
  "wa-session": "WhatsApp session message", "rcs-template": "RCS template", "rcs-message": "RCS text or rich card",
};

const PV_SAMPLES = {
  smsBroken: '{\n  "sms": [\n    {\n      "sender": "ONEXTL",\n      "recipient": "9823329163",\n      "type": "TRANS",\n      "messageBody": "1234 is your ONEXTEL verification code. Visit https://onextel.com/help",\n      "templateId": 1007206634501788500,\n      "entityId": "10019213851834602",\n      "unicode": 0,\n      "custRef1": { "CustomReference1": "order-1042", "CustomReference9": "x" }\n    }\n  ],\n  "campaignName": "OTP-OCT",\n  "prefix": "",\n  "validation": true,\n  "urlShortener": { "flag": 1, "urlDetails": [ { "longUrl": "https://onextel.com/help" } ] }\n}',
  sms: { sms: [{ sender: "ONEXTL", recipient: "919999999999", type: "SE", messageBody: "1234 is your ONEXTEL verification code.", templateId: "1007206634501788500", entityId: "1001921385183460200", unicode: 0, custRef1: { CustomReference1: "order-1042", CustomReference2: "123" } }], campaignName: "SMS2026", prefix: "", validation: true },
  intl: { key: "YOUR_API_KEY", listsms: [{ from: "OneXtel", to: "971501234567", body: "Your code is 4821.", clientsmsid: "c-1001", custref1: "order-1042" }] },
  "wa-template": { wa: [{ messaging_product: "whatsapp", recipient_type: "individual", recipient: ["9999999999"], sender: "919217090193", type: "template", template: { name: "order_update", language: { code: "en_US" }, components: [{ type: "body", parameters: [{ type: "text", text: "Arjun" }, { type: "text", text: "1042" }] }] }, custref1: "order-1042" }], prefix: "+91", campaignName: "orders" },
  "wa-session": { wa: [{ messaging_product: "whatsapp", recipient_type: "individual", recipient: "919999999999", sender: "919217090193", type: "interactive", interactive: { type: "button", body: { text: "Did your order arrive?" }, action: { buttons: [{ type: "reply", reply: { id: "yes", title: "Yes" } }, { type: "reply", reply: { id: "no", title: "No" } }] } } }] },
  "rcs-template": { rcs: [{ messageType: "Transactional", recipient: "9999999999", sender: "Acme_trans", ttl: "1200s", contentMessage: { templateMessage: { templateCode: "payment_success_onex", customParams: "{\"custom_param1\":\"Arjun\"}" } }, custref1: "pay-1042" }], prefix: "+91", campaignName: "payments" },
  "rcs-message": { rcs: [{ messageType: "Promotional", recipient: "9999999999", sender: "Acme_promo", contentMessage: { richCard: { standaloneCard: { cardOrientation: "VERTICAL", cardContent: { title: "Festive offer", description: "Up to 40% off this week.", media: { height: "MEDIUM", contentInfo: { fileUrl: "https://example.com/banner.jpg" } }, suggestions: [{ action: { displayText: "Shop now", openUrlAction: { url: "https://example.com/sale" } } }] } } } } }], prefix: "+91" },
};

const pvSample = (key) => (typeof PV_SAMPLES[key] === "string" ? PV_SAMPLES[key] : JSON.stringify(PV_SAMPLES[key], null, 2));

const pvIsObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const pvIsStr = (v) => typeof v === "string";
const pvDigits = (v) => String(v).replace(/\D/g, "");

const PV_GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà^{}\\[~]|€";
const pvNonGsm = (s) => [...String(s)].filter((c) => !PV_GSM.includes(c));

const pvRun = () => {
  const f = [];
  const add = (sev, path, msg, api, doc) => f.push({ sev, path, msg, api, doc });
  return { f, err: (...a) => add("error", ...a), warn: (...a) => add("warning", ...a), info: (...a) => add("info", ...a) };
};

const pvRequireStr = (r, obj, key, path, api, doc) => {
  const v = obj[key];
  if (v === undefined || v === null || (pvIsStr(v) && v.trim() === "")) { r.err(path, `\`${key}\` is required.`, api, doc); return false; }
  if (!pvIsStr(v)) r.warn(path, `\`${key}\` should be a string.`, null, doc);
  return true;
};

const pvUnknown = (r, obj, known, path, doc) => {
  Object.keys(obj).forEach((k) => {
    if (!known.includes(k)) r.info(`${path}.${k}`, `\`${k}\` is not a documented field here. It is ignored, or rejected if \`validation\` is strict.`, null, doc);
  });
};

const pvIndia = (r, value, path, doc, opts = {}) => {
  const raw = String(value);
  if (/[^\d+\s-]/.test(raw)) { r.err(path, `\`${raw}\` contains characters other than digits.`, "Rejected, or submitted to an address that cannot receive it.", doc); return; }
  if (/[\s-]/.test(raw)) r.warn(path, "Remove spaces and dashes. Send digits only.", null, doc);
  if (raw.startsWith("+")) r.warn(path, "Drop the leading `+`. Send digits only.", null, doc);
  const d = pvDigits(raw);
  const billed = opts.lenient ? "`/send_sms` accepts and bills it anyway. It cannot be delivered." : "It cannot be delivered.";
  if (/^91[6-9]\d{9}$/.test(d)) return;
  if (/^[6-9]\d{9}$/.test(d)) {
    if (!opts.prefixSet) r.warn(path, `\`${d}\` has no country code.`, (opts.lenient ? "`/send_sms` accepts it as it is. " : "") + "Send `91" + d + "`, or set `prefix`.", doc);
    return;
  }
  if (/^0[6-9]\d{9}$/.test(d)) { r.warn(path, `Drop the leading 0 from \`${d}\`.`, null, doc); return; }
  if (/^91\d{10}$/.test(d)) { r.warn(path, `\`${d}\` is not a mobile number: Indian mobiles start with 6, 7, 8 or 9 after the 91.`, billed, doc); return; }
  r.warn(path, `\`${d}\` is not a valid Indian mobile number: 10 digits in the 6–9 series, optionally after 91.`, opts.lenient ? billed : null, doc);
};

const pvIntl = (r, value, path, doc) => {
  const raw = String(value);
  if (raw.startsWith("+")) r.warn(path, "Drop the leading `+`. Send digits only, with the country code.", null, doc);
  const d = pvDigits(raw);
  if (d.length < 8 || d.length > 15 || /[^\d+]/.test(raw)) r.err(path, `\`${raw}\` is not a valid international number: 8 to 15 digits including the country code.`, "Rejected as an invalid mobile number (code 900101).", doc);
};

const pvAnyNumber = (r, value, path, doc, prefixSet) => {
  const d = pvDigits(value);
  if (/^[6-9]\d{9}$/.test(d) && prefixSet) return;
  if (d.startsWith("91") || /^[6-9]\d{9}$/.test(d)) pvIndia(r, value, path, doc, { prefixSet });
  else pvIntl(r, value, path, doc);
};

const pvUrlShortener = (r, us, path, doc, opts = {}) => {
  if (!pvIsObj(us)) { r.err(path, "`urlShortener` must be an object.", null, doc); return; }
  const allowed = opts.allowFlag2 ? [0, 1, 2] : [0, 1];
  if (!allowed.includes(us.flag)) r.err(`${path}.flag`, `\`flag\` must be ${allowed.join(", ").replace(/, (\d)$/, " or $1")}.`, null, doc);
  if (us.urlDetails === undefined) return;
  if (!Array.isArray(us.urlDetails)) { r.err(`${path}.urlDetails`, "`urlDetails` must be an array.", null, doc); return; }
  us.urlDetails.forEach((u, i) => {
    const p = `${path}.urlDetails[${i}]`;
    if (!pvIsObj(u)) { r.err(p, "Each entry must be an object.", null, doc); return; }
    if (us.flag === 1 && !u.longUrl) r.err(`${p}.longUrl`, "`longUrl` is required when `flag` is 1.", null, doc);
    if (u.longUrl && !/^https?:\/\//.test(u.longUrl)) r.warn(`${p}.longUrl`, "`longUrl` should start with `http://` or `https://`.", null, doc);
    if (opts.domainRequired && !u.domain) r.err(`${p}.domain`, "`domain` is required whenever `urlDetails` is given.", null, doc);
    if (u.longUrl && opts.bodies && !opts.bodies.some((b) => String(b).includes(u.longUrl))) r.warn(`${p}.longUrl`, "This URL does not appear in any message body, so there is nothing to shorten.", null, doc);
  });
  if (us.flag === 1 && us.urlDetails.length === 0) r.info(`${path}.urlDetails`, "An empty `urlDetails` with `flag` 1 shortens every URL in the body.", null, doc);
};

const pvCustRefs = (r, item, path, doc, max, opts = {}) => {
  const base = opts.camel ? "custRef" : "custref";
  Object.keys(item).forEach((k) => {
    const m = /^cust[rR]ef(\d+)$/.exec(k);
    if (!m) return;
    const n = Number(m[1]);
    if (n < 1 || n > max) r.warn(`${path}.${k}`, `Only \`${base}1\` to \`${base}${max}\` are supported.`, "Extra references are ignored.", doc);
    const v = item[k];
    if (pvIsObj(v) && opts.allowObject) {
      Object.keys(v).forEach((ck) => { if (!/^CustomReference[1-4]$/.test(ck)) r.warn(`${path}.${k}.${ck}`, `\`${ck}\` is not a recognised key. Use \`CustomReference1\` to \`CustomReference4\`.`, null, doc); });
    } else if (!pvIsStr(v) && typeof v !== "number") {
      r.warn(`${path}.${k}`, `\`${k}\` should be a string${opts.allowObject ? " or a `CustomReference` object" : ""}.`, null, doc);
    }
    if (opts.camel && /^custref/.test(k)) r.warn(`${path}.${k}`, `Use \`custRef${m[1]}\`, with a capital R, on this API.`, null, doc);
  });
};

const pvSms = (r, b) => {
  const d = PV_DOC.sms;
  if (!("sms" in b)) {
    const alt = ["smsList", "smslist", "SMS", "messages"].find((k) => k in b);
    r.err("sms", alt ? `The envelope key is \`sms\`, not \`${alt}\`.` : "`sms` is required: an array of message objects.", alt ? "Nothing is sent." : null, d);
    return;
  }
  if (!Array.isArray(b.sms)) { r.err("sms", "`sms` must be an array.", null, d); return; }
  if (b.sms.length === 0) r.warn("sms", "`sms` is empty.", "Accepted with HTTP 200 and an empty list. Nothing is sent.", d);
  if ("apikey" in b || "apiKey" in b) r.warn("apikey", "The API key goes in the `apikey` header, not the body.", null, d);
  const prefixSet = pvIsStr(b.prefix) && b.prefix.trim() !== "";
  const flag2 = pvIsObj(b.urlShortener) && b.urlShortener.flag === 2;
  const bodies = [];
  b.sms.forEach((m, i) => {
    const p = `sms[${i}]`;
    if (!pvIsObj(m)) { r.err(p, "Each entry must be an object.", null, d); return; }
    pvRequireStr(r, m, "sender", `${p}.sender`, "Rejected with status 700: `invalid header`.", d);
    if (m.recipient === undefined || m.recipient === null || m.recipient === "") r.err(`${p}.recipient`, "`recipient` is required.", "Rejected with status 700: `invalid receipient`.", d);
    else pvIndia(r, m.recipient, `${p}.recipient`, d, { prefixSet, lenient: true });
    if (pvRequireStr(r, m, "messageBody", `${p}.messageBody`, "Rejected with status 700: `invalid message`.", d)) {
      bodies.push(m.messageBody);
      const odd = pvNonGsm(m.messageBody);
      if (odd.length && m.unicode !== 1) r.warn(`${p}.unicode`, `The body contains characters outside the GSM alphabet (${[...new Set(odd)].slice(0, 6).join(" ")}). Set \`unicode\` to 1.`, "Without it, those characters arrive garbled.", d);
      if (!odd.length && m.unicode === 1) r.info(`${p}.unicode`, "`unicode` is 1 but the body is plain GSM text. Unicode parts hold 70 characters instead of 160, so the message may cost more parts.", null, d);
    }
    if (m.type === undefined || m.type === null) r.err(`${p}.type`, "`type` is required: `SI`, `OTP` or `SE`.", "Rejected with status 700: `invalid type`.", d);
    else if (!["SI", "OTP", "SE"].includes(m.type)) {
      const up = String(m.type).toUpperCase();
      r.err(`${p}.type`, ["SI", "OTP", "SE"].includes(up) ? `\`type\` is case-sensitive: use \`${up}\`.` : `\`${m.type}\` is not a valid type. Use \`SI\`, \`OTP\` or \`SE\`, matching the DLT category of the template.`, "Rejected with status 700: `invalid type`.", d);
    }
    ["templateId", "entityId"].forEach((k) => {
      if (m[k] === undefined) return;
      if (typeof m[k] === "number") { if (String(m[k]).length < 16) r.warn(`${p}.${k}`, `\`${k}\` should be a quoted string.`, null, d); }
      else if (!/^\d+$/.test(String(m[k]))) r.warn(`${p}.${k}`, `\`${k}\` should contain digits only.`, null, d);
    });
    if (m.templateId === undefined && m.entityId === undefined && !flag2) r.info(p, "No `templateId` or `entityId`. The API accepts this; delivery then depends on template auto-match being enabled on your API key, or DLT rejects the message.", null, PV_DOC.smsErr);
    else if ((m.templateId === undefined) !== (m.entityId === undefined) && !flag2) r.warn(p, `\`${m.templateId === undefined ? "templateId" : "entityId"}\` is missing. DLT needs both, unless template auto-match is on.`, null, d);
    if (m.unicode !== undefined && ![0, 1].includes(m.unicode)) r.warn(`${p}.unicode`, "`unicode` should be the number 0 or 1.", null, d);
    if (flag2 && (m.templateId !== undefined || m.entityId !== undefined)) r.err(p, "With `urlShortener.flag` 2, do not send `templateId` or `entityId`.", "Flag 2 works only with template auto-match, which fills both in.", d);
    pvCustRefs(r, m, p, d, 5, { allowObject: true, camel: true });
    pvUnknown(r, m, ["sender", "recipient", "messageBody", "type", "templateId", "entityId", "unicode", "custRef1", "custRef2", "custRef3", "custRef4", "custRef5", "custref1", "custref2", "custref3", "custref4", "custref5"], p, d);
  });
  if (b.validation !== undefined && typeof b.validation !== "boolean") r.warn("validation", "`validation` should be `true` or `false`.", null, d);
  if (b.validation === false) r.info("validation", "With `validation` false, malformed entries are processed instead of rejected.", null, d);
  if (b.prefix !== undefined && !pvIsStr(b.prefix)) r.warn("prefix", "`prefix` should be a string, such as `\"+91\"` or `\"\"`.", null, d);
  if (b.urlShortener !== undefined) pvUrlShortener(r, b.urlShortener, "urlShortener", d, { allowFlag2: true, domainRequired: true, bodies });
  pvUnknown(r, b, ["sms", "campaignName", "prefix", "validation", "urlShortener", "apikey", "apiKey"], "body", d);
};

const pvIntlList = (r, b) => {
  const d = PV_DOC.intl;
  if (!b.key) r.err("key", "`key` is required: on this API the API key goes in the body.", "Rejected: authentication failure.", d);
  if (!Array.isArray(b.listsms)) { r.err("listsms", "`listsms` is required: an array of message objects.", null, d); return; }
  if (b.listsms.length === 0) r.warn("listsms", "`listsms` is empty. Nothing is sent.", null, d);
  if (b.listsms.length > 2500) r.err("listsms", `\`listsms\` has ${b.listsms.length} entries. The maximum is 2,500 per request.`, null, d);
  b.listsms.forEach((m, i) => {
    const p = `listsms[${i}]`;
    if (!pvIsObj(m)) { r.err(p, "Each entry must be an object.", null, d); return; }
    pvRequireStr(r, m, "from", `${p}.from`, null, d);
    if (!m.to) r.err(`${p}.to`, "`to` is required, with the country code.", null, d); else pvIntl(r, m.to, `${p}.to`, d);
    pvRequireStr(r, m, "body", `${p}.body`, null, d);
    if (m.body && pvNonGsm(m.body).length) r.info(`${p}.body`, "The body contains characters outside the GSM alphabet, so it is sent as Unicode: 70 characters per part instead of 160.", null, d);
    pvCustRefs(r, m, p, d, 5, {});
    pvUnknown(r, m, ["from", "to", "body", "clientsmsid", "custref1", "custref2", "custref3", "custref4", "custref5"], p, d);
  });
  pvUnknown(r, b, ["key", "listsms"], "body", d);
};

const pvWaCommon = (r, m, p, d) => {
  if (m.messaging_product !== "whatsapp") r.err(`${p}.messaging_product`, "`messaging_product` must be `\"whatsapp\"`.", null, d);
  if (m.recipient_type === undefined) r.err(`${p}.recipient_type`, "`recipient_type` is required: `\"individual\"`.", null, d);
  else if (m.recipient_type !== "individual") r.err(`${p}.recipient_type`, "`recipient_type` must be `\"individual\"`.", null, d);
  if (!pvRequireStr(r, m, "sender", `${p}.sender`, null, d)) return;
  const s = pvDigits(m.sender);
  if (s.length >= 16 && s === String(m.sender)) r.warn(`${p}.sender`, "This looks like a WhatsApp Business Account ID. `sender` takes the business phone number, with its country code.", "A WABA ID is rejected as `API_Invalid_Sender`.", d);
};

const pvWaTemplate = (r, b) => {
  const d = PV_DOC.waT;
  if (!Array.isArray(b.wa)) { r.err("wa", "`wa` is required: an array of message objects.", null, d); return; }
  if (b.wa.length === 0) r.warn("wa", "`wa` is empty. Nothing is sent.", null, d);
  const prefixSet = pvIsStr(b.prefix) && b.prefix.trim() !== "";
  b.wa.forEach((m, i) => {
    const p = `wa[${i}]`;
    if (!pvIsObj(m)) { r.err(p, "Each entry must be an object.", null, d); return; }
    pvWaCommon(r, m, p, d);
    if (m.type !== "template") r.err(`${p}.type`, "`type` must be `\"template\"` for a template message.", null, d);
    const recips = Array.isArray(m.recipient) ? m.recipient : (m.recipient !== undefined ? [m.recipient] : []);
    if (!recips.length) r.err(`${p}.recipient`, "`recipient` is required.", null, d);
    recips.forEach((x, j) => pvAnyNumber(r, x, Array.isArray(m.recipient) ? `${p}.recipient[${j}]` : `${p}.recipient`, d, prefixSet));
    const t = m.template;
    if (!pvIsObj(t)) { r.err(`${p}.template`, "`template` is required: `name`, `language.code` and `components`.", null, d); return; }
    pvRequireStr(r, t, "name", `${p}.template.name`, "Rejected by Meta: template does not exist (132001).", d);
    if (t.name && /[A-Z\s]/.test(t.name)) r.warn(`${p}.template.name`, "Template names are lowercase with underscores. Check it matches the approved name exactly.", null, d);
    if (!pvIsObj(t.language) || !t.language.code) r.err(`${p}.template.language.code`, "`language.code` is required, for example `en_US`.", null, d);
    if (t.components === undefined) r.warn(`${p}.template.components`, "`components` is missing. Send an empty array for a template with no variables.", null, d);
    else if (!Array.isArray(t.components)) r.err(`${p}.template.components`, "`components` must be an array.", null, d);
    else t.components.forEach((c, k) => {
      const cp = `${p}.template.components[${k}]`;
      if (!pvIsObj(c)) { r.err(cp, "Each component must be an object.", null, d); return; }
      const types = ["header", "body", "button", "limited_time_offer", "carousel"];
      if (!types.includes(c.type)) r.err(`${cp}.type`, `\`type\` must be one of ${types.map((x) => "`" + x + "`").join(", ")}.`, null, d);
      if (c.type === "button") {
        if (!c.sub_type) r.err(`${cp}.sub_type`, "A button component needs `sub_type`, such as `url`, `quick_reply` or `copy_code`.", null, d);
        if (c.index === undefined) r.err(`${cp}.index`, "A button component needs `index`, the button's position starting at 0.", null, d);
      }
      if (c.type === "limited_time_offer" && !(pvIsObj(c.parameters?.[0]?.limited_time_offer) && Number.isInteger(c.parameters[0].limited_time_offer.expiration_time_ms)))
        r.err(`${cp}.parameters`, "A limited-time offer needs `limited_time_offer.expiration_time_ms`, a UNIX time in milliseconds.", null, d);
      if (c.type === "carousel") {
        if (!Array.isArray(c.cards) || c.cards.length < 2 || c.cards.length > 10) r.err(`${cp}.cards`, "A carousel needs 2 to 10 `cards`.", null, d);
        (c.cards || []).forEach((card, n) => { if (card.card_index === undefined) r.err(`${cp}.cards[${n}].card_index`, "Each card needs `card_index`, starting at 0.", null, d); });
      }
      if (c.parameters !== undefined && !Array.isArray(c.parameters)) r.err(`${cp}.parameters`, "`parameters` must be an array.", null, d);
      (Array.isArray(c.parameters) ? c.parameters : []).forEach((prm, n) => {
        if (!pvIsObj(prm) || !prm.type) r.err(`${cp}.parameters[${n}].type`, "Each parameter needs a `type`, such as `text`, `image` or `coupon_code`.", null, d);
        else if (prm.type === "text" && (prm.text === undefined || prm.text === "")) r.err(`${cp}.parameters[${n}].text`, "A `text` parameter needs a non-empty `text`.", "Rejected by Meta: parameter mismatch (132000).", d);
      });
    });
    pvCustRefs(r, m, p, d, 5, {});
  });
  if (b.message_send_ttl_seconds !== undefined && !Number.isInteger(b.message_send_ttl_seconds)) r.warn("message_send_ttl_seconds", "`message_send_ttl_seconds` should be a whole number of seconds.", null, d);
};

const pvWaInteractive = (r, it, p, d) => {
  if (!pvIsObj(it)) { r.err(p, "An interactive message needs an `interactive` object.", null, d); return; }
  const types = ["button", "list", "cta_url", "carousel", "address_message"];
  if (!types.includes(it.type)) { r.err(`${p}.type`, `\`interactive.type\` must be one of ${types.map((x) => "`" + x + "`").join(", ")}.`, null, d); return; }
  if (!(pvIsObj(it.body) && it.body.text)) r.err(`${p}.body.text`, "`body.text` is required.", null, d);
  const a = it.action;
  if (!pvIsObj(a)) { r.err(`${p}.action`, "`action` is required.", null, d); return; }
  if (it.type === "button") {
    if (!Array.isArray(a.buttons) || !a.buttons.length) r.err(`${p}.action.buttons`, "Add 1 to 3 reply `buttons`.", null, d);
    else {
      if (a.buttons.length > 3) r.err(`${p}.action.buttons`, `${a.buttons.length} buttons: the maximum is 3.`, null, d);
      a.buttons.forEach((bt, n) => {
        if (!(pvIsObj(bt.reply) && bt.reply.id && bt.reply.title)) r.err(`${p}.action.buttons[${n}].reply`, "Each button needs `reply.id` and `reply.title`.", null, d);
        else if (String(bt.reply.title).length > 20) r.err(`${p}.action.buttons[${n}].reply.title`, `Button titles are limited to 20 characters; this one has ${String(bt.reply.title).length}.`, null, d);
      });
    }
  }
  if (it.type === "list") {
    if (!a.button) r.err(`${p}.action.button`, "A list needs `action.button`, the label of the button that opens it.", null, d);
    if (!Array.isArray(a.sections) || !a.sections.length) r.err(`${p}.action.sections`, "A list needs at least one section with `rows`.", null, d);
    else a.sections.forEach((s, n) => { if (!Array.isArray(s.rows) || !s.rows.length) r.err(`${p}.action.sections[${n}].rows`, "Each section needs `rows`, each with an `id` and `title`.", null, d); });
  }
  if (it.type === "cta_url" && !(pvIsObj(a.parameters) && a.parameters.display_text && a.parameters.url)) r.err(`${p}.action.parameters`, "A URL button needs `action.parameters.display_text` and `url`.", null, d);
  if (it.type === "carousel") {
    if (!Array.isArray(a.cards) || a.cards.length < 2 || a.cards.length > 10) r.err(`${p}.action.cards`, "A carousel needs 2 to 10 `cards`.", null, d);
    else a.cards.forEach((c, n) => {
      if (c.card_index === undefined) r.err(`${p}.action.cards[${n}].card_index`, "Each card needs `card_index`, starting at 0.", null, d);
      if (!pvIsObj(c.header) || !["image", "video"].includes(c.header.type)) r.err(`${p}.action.cards[${n}].header.type`, "Carousel cards take an `image` or `video` header only.", null, d);
    });
  }
  if (it.type === "address_message" && a.name !== "address_message") r.err(`${p}.action.name`, "`action.name` must be `\"address_message\"`.", null, d);
};

const pvWaSession = (r, b) => {
  const d = PV_DOC.waS;
  if (!Array.isArray(b.wa)) { r.err("wa", "`wa` is required: an array of message objects.", null, d); return; }
  if (b.wa.length === 0) r.warn("wa", "`wa` is empty. Nothing is sent.", null, d);
  const prefixSet = pvIsStr(b.prefix) && b.prefix.trim() !== "";
  b.wa.forEach((m, i) => {
    const p = `wa[${i}]`;
    if (!pvIsObj(m)) { r.err(p, "Each entry must be an object.", null, d); return; }
    pvWaCommon(r, m, p, d);
    if (m.recipient === undefined) r.err(`${p}.recipient`, "`recipient` is required.", null, d); else pvAnyNumber(r, m.recipient, `${p}.recipient`, d, prefixSet);
    const media = ["image", "video", "audio", "document", "sticker"];
    const types = ["text", ...media, "interactive", "contacts"];
    if (!types.includes(m.type)) { r.err(`${p}.type`, `\`type\` must be one of ${types.map((x) => "`" + x + "`").join(", ")}.`, null, d); return; }
    r.info(p, "Session messages send only within 24 hours of the customer's last message. Outside that window, send a template.", "Meta rejects it as outside the window (131047).", d);
    if (m.type === "text" && !(pvIsObj(m.text) && m.text.body)) r.err(`${p}.text.body`, "A text message needs `text.body`.", null, d);
    if (media.includes(m.type)) {
      const o = m[m.type];
      if (!pvIsObj(o) || (!o.link && !o.id)) r.err(`${p}.${m.type}`, `A ${m.type} message needs \`${m.type}.link\`, a media URL, or \`${m.type}.id\`, an uploaded media ID.`, null, d);
      else {
        if (o.caption !== undefined && !["image", "video", "document"].includes(m.type)) r.warn(`${p}.${m.type}.caption`, "`caption` applies only to image, video and document.", null, d);
        if (o.voice !== undefined && m.type !== "audio") r.warn(`${p}.${m.type}.voice`, "`voice` applies only to audio.", null, d);
        if (o.link && !/^https:\/\//.test(o.link)) r.warn(`${p}.${m.type}.link`, "Media links should be public `https://` URLs.", null, d);
      }
    }
    if (m.type === "contacts" && !Array.isArray(m.contacts)) r.err(`${p}.contacts`, "A contacts message needs a `contacts` array.", null, d);
    if (m.type === "interactive") pvWaInteractive(r, m.interactive, `${p}.interactive`, d);
  });
};

const pvCard = (r, c, p, d) => {
  if (!pvIsObj(c)) { r.err(p, "Card content is required.", null, d); return; }
  if (!c.title) r.err(`${p}.title`, "`title` is required.", null, d);
  else if (String(c.title).length > 200) r.err(`${p}.title`, "Card titles are limited to 200 characters.", null, d);
  if (!c.description) r.err(`${p}.description`, "`description` is required.", null, d);
  else if (String(c.description).length > 2000) r.err(`${p}.description`, "Card descriptions are limited to 2,000 characters.", null, d);
  const md = c.media;
  if (md !== undefined) {
    if (!pvIsObj(md?.contentInfo) || !md.contentInfo.fileUrl) r.err(`${p}.media.contentInfo.fileUrl`, "Card media needs `contentInfo.fileUrl`, a public URL or a media file name.", null, d);
    if (md.height !== undefined && !["SHORT", "MEDIUM", "TALL", "SHORT_HEIGHT", "MEDIUM_HEIGHT", "TALL_HEIGHT"].includes(md.height)) r.err(`${p}.media.height`, "`height` must be `SHORT`, `MEDIUM` or `TALL`.", null, d);
  }
  if (c.suggestions !== undefined) {
    if (!Array.isArray(c.suggestions)) r.err(`${p}.suggestions`, "`suggestions` must be an array.", null, d);
    else {
      if (c.suggestions.length > 4) r.err(`${p}.suggestions`, `${c.suggestions.length} suggestions: a card holds at most 4.`, null, d);
      c.suggestions.forEach((s, n) => {
        const inner = s.action || s.reply || {};
        if (!inner.displayText) r.err(`${p}.suggestions[${n}]`, "Each suggestion needs `displayText`.", null, d);
        else if (String(inner.displayText).length > 25) r.err(`${p}.suggestions[${n}].displayText`, `Suggestion labels are limited to 25 characters; this one has ${String(inner.displayText).length}.`, null, d);
      });
    }
  }
};

const pvRcsTemplate = (r, t, p, d) => {
  if (!pvIsObj(t)) { r.err(p, "`templateMessage` must be an object.", null, d); return; }
  pvRequireStr(r, t, "templateCode", `${p}.templateCode`, "Rejected: template not found for this sender (4001 or 4006).", d);
  if (t.customParams === undefined) return;
  if (pvIsObj(t.customParams)) { r.err(`${p}.customParams`, "`customParams` must be a JSON string, not an object. Wrap it: `\"{\\\"custom_param1\\\":\\\"Arjun\\\"}\"`.", null, d); return; }
  if (!pvIsStr(t.customParams)) { r.err(`${p}.customParams`, "`customParams` must be a JSON string.", null, d); return; }
  let parsed;
  try { parsed = JSON.parse(t.customParams); } catch (e) {
    r.err(`${p}.customParams`, "`customParams` is not valid JSON inside the string.", "Rejected: custom parameters not valid (4007).", d);
    if (/}\s*,\s*{/.test(t.customParams)) r.info(`${p}.customParams`, "It looks like two objects separated by a comma. Send one object with every key in it.", null, d);
    return;
  }
  if (!pvIsObj(parsed)) { r.err(`${p}.customParams`, "`customParams` must encode one JSON object of key-value pairs.", null, d); return; }
  Object.entries(parsed).forEach(([k, v]) => {
    if (/^\[.*\]$/.test(k)) r.warn(`${p}.customParams`, `Key \`${k}\` includes the square brackets. Use the placeholder name alone, such as \`${k.slice(1, -1)}\`.`, "The placeholder stays unfilled on the handset.", d);
    if (typeof v !== "string") r.warn(`${p}.customParams`, `Value for \`${k}\` should be a string.`, null, d);
  });
};

const pvRcsContent = (r, cm, p, d) => {
  if (cm.text !== undefined) {
    if (!pvIsStr(cm.text) || !cm.text.trim()) r.err(`${p}.text`, "`text` must be a non-empty string.", null, d);
    else if (cm.text.length > 3072) r.err(`${p}.text`, `\`text\` is ${cm.text.length} characters. RCS text messages are limited to 3,072.`, null, d);
  }
  const rc = cm.richCard;
  if (rc === undefined) return;
  if (!pvIsObj(rc)) { r.err(`${p}.richCard`, "`richCard` must be an object.", null, d); return; }
  if (rc.standaloneCard) {
    const s = rc.standaloneCard, sp = `${p}.richCard.standaloneCard`;
    if (!["VERTICAL", "HORIZONTAL"].includes(s.cardOrientation)) r.err(`${sp}.cardOrientation`, "`cardOrientation` must be `VERTICAL` or `HORIZONTAL`.", null, d);
    pvCard(r, s.cardContent, `${sp}.cardContent`, d);
  } else if (rc.carouselCard) {
    const c = rc.carouselCard, cp = `${p}.richCard.carouselCard`;
    if (!["MEDIUM_WIDTH", "SMALL_WIDTH", "MEDIUM", "SMALL"].includes(c.cardWidth)) r.err(`${cp}.cardWidth`, "`cardWidth` must be `MEDIUM_WIDTH` or `SMALL_WIDTH`.", null, d);
    if (!Array.isArray(c.cardContents) || c.cardContents.length < 2 || c.cardContents.length > 10) r.err(`${cp}.cardContents`, "A carousel needs 2 to 10 `cardContents`.", null, d);
    else c.cardContents.forEach((cc, n) => pvCard(r, cc, `${cp}.cardContents[${n}]`, d));
  } else r.err(`${p}.richCard`, "`richCard` needs `standaloneCard` or `carouselCard`.", null, d);
};

const pvRcs = (r, b, kind) => {
  const d = kind === "template" ? PV_DOC.rcsT : PV_DOC.rcsM;
  if (!Array.isArray(b.rcs)) { r.err("rcs", "`rcs` is required: an array of message objects.", null, d); return; }
  if (b.rcs.length === 0) r.warn("rcs", "`rcs` is empty. Nothing is sent.", null, d);
  if (b.rcs.length > 500) r.err("rcs", `\`rcs\` has ${b.rcs.length} entries. The maximum is 500 per request.`, null, d);
  const prefixSet = pvIsStr(b.prefix) && b.prefix.trim() !== "";
  b.rcs.forEach((m, i) => {
    const p = `rcs[${i}]`;
    if (!pvIsObj(m)) { r.err(p, "Each entry must be an object.", null, d); return; }
    if (!m.messageType) r.err(`${p}.messageType`, "`messageType` is required: `Promotional` or `Transactional`.", null, d);
    else if (String(m.messageType).toUpperCase() === "OTP") r.err(`${p}.messageType`, "OTP is not an RCS message type. Send one-time codes as `Transactional`.", null, d);
    else if (!["Promotional", "Transactional"].includes(m.messageType)) {
      const fix = ["Promotional", "Transactional"].find((x) => x.toLowerCase() === String(m.messageType).toLowerCase());
      r.err(`${p}.messageType`, fix ? `Use \`${fix}\`, with that capitalisation.` : "`messageType` must be `Promotional` or `Transactional`.", null, d);
    }
    pvRequireStr(r, m, "sender", `${p}.sender`, null, d);
    if (m.sender && m.messageType && /_(promo|promotional|trans|transactional)$/i.test(m.sender)) {
      const promoSender = /_promo/i.test(m.sender);
      if ((m.messageType === "Promotional") !== promoSender) r.warn(`${p}.sender`, `The sender name suggests a ${promoSender ? "promotional" : "transactional"} profile, but \`messageType\` is ${m.messageType}.`, "Templates are approved per category, so this usually fails to find the template.", d);
    }
    const recips = Array.isArray(m.recipient) ? m.recipient : (m.recipient !== undefined ? [m.recipient] : []);
    if (!recips.length) r.err(`${p}.recipient`, "`recipient` is required.", null, d);
    recips.forEach((x, j) => pvAnyNumber(r, x, Array.isArray(m.recipient) ? `${p}.recipient[${j}]` : `${p}.recipient`, d, prefixSet));
    if (m.ttl !== undefined && !/^\d+s$/.test(String(m.ttl))) r.err(`${p}.ttl`, "`ttl` must be digits followed by `s`, such as `\"1200s\"`.", "Jio rejects it with code 17.", d);
    if (m.ttl !== undefined && m.expireTime !== undefined) r.err(p, "Send `ttl` or `expireTime`, not both.", "Jio rejects it with code 15.", d);
    if (m.expireTime !== undefined && isNaN(Date.parse(m.expireTime))) r.err(`${p}.expireTime`, "`expireTime` must be an ISO 8601 time, such as `2026-11-02T15:01:23Z`.", null, d);
    const cm = m.contentMessage;
    if (!pvIsObj(cm)) { r.err(`${p}.contentMessage`, "`contentMessage` is required.", null, d); return; }
    if (cm.ttl !== undefined) r.warn(`${p}.contentMessage.ttl`, "`ttl` belongs on the message object, beside `contentMessage`, not inside it.", null, d);
    if (cm.templateMessage) pvRcsTemplate(r, cm.templateMessage, `${p}.contentMessage.templateMessage`, PV_DOC.rcsT);
    else if (cm.text !== undefined || cm.richCard !== undefined) pvRcsContent(r, cm, `${p}.contentMessage`, PV_DOC.rcsM);
    else r.err(`${p}.contentMessage`, "`contentMessage` needs `templateMessage`, `text` or `richCard`.", null, d);
    pvCustRefs(r, m, p, d, 6, {});
  });
  if (b.urlShortener !== undefined) pvUrlShortener(r, b.urlShortener, "urlShortener", d, {});
};

const pvDetect = (b) => {
  if (!pvIsObj(b)) return null;
  if ("listsms" in b) return "intl";
  if ("sms" in b || "smsList" in b || "smslist" in b) return "sms";
  if (Array.isArray(b.wa)) return b.wa.some((m) => pvIsObj(m) && m.type === "template") ? "wa-template" : "wa-session";
  if (Array.isArray(b.rcs)) return b.rcs.some((m) => pvIsObj(m?.contentMessage) && m.contentMessage.templateMessage) ? "rcs-template" : "rcs-message";
  return null;
};

// JSON.parse silently rounds integers beyond 2^53, so read the raw text.
const pvPrecision = (r, raw, doc) => {
  const re = /"([^"\\]+)"\s*:\s*(-?\d{16,})(?=\s*[,}\]])|[\[,]\s*(\d{16,})(?=\s*[,\]])/g;
  let m;
  while ((m = re.exec(raw))) {
    const key = m[1], num = m[2] || m[3];
    r.warn(key || "array value", `${key ? "`" + key + "`" : "A value"} is a ${num.length}-digit number. Any JavaScript that parses this JSON on its way to OneXtel, such as a browser, a Node service or a no-code tool, rounds it, so the ID can change before it arrives. Put it in quotes.`, `JavaScript reads it as ${BigInt(Number(num)).toString()}.`, doc);
  }
};

const pvValidate = (raw, hint) => {
  const r = pvRun();
  if (!raw.trim()) return { channel: null, f: [], empty: true };
  let body;
  try { body = JSON.parse(raw); } catch (e) {
    const msg = String(e.message || e);
    const pos = /position (\d+)/.exec(msg);
    let where = "body";
    if (pos) { const before = raw.slice(0, Number(pos[1])); where = `line ${before.split("\n").length}, column ${before.length - before.lastIndexOf("\n")}`; }
    r.err(where, "This is not valid JSON.", msg + (/'/.test(raw) ? " JSON needs double quotes, not single quotes." : "") + (/,\s*[}\]]/.test(raw) ? " Check for a trailing comma before a closing bracket." : ""), null);
    return { channel: null, f: r.f };
  }
  const channel = hint === "auto" ? pvDetect(body) : hint;
  if (!channel) {
    r.err("body", "Could not tell which API this is for. The body needs an `sms`, `listsms`, `wa` or `rcs` array.", "Choose the API above to check it anyway.", null);
    return { channel: null, f: r.f };
  }
  const doc = { sms: PV_DOC.sms, intl: PV_DOC.intl, "wa-template": PV_DOC.waT, "wa-session": PV_DOC.waS, "rcs-template": PV_DOC.rcsT, "rcs-message": PV_DOC.rcsM }[channel];
  pvPrecision(r, raw, doc);
  if (!pvIsObj(body)) { r.err("body", "The body must be a JSON object.", null, doc); return { channel, f: r.f }; }
  const checks = { sms: pvSms, intl: pvIntlList, "wa-template": pvWaTemplate, "wa-session": pvWaSession,
    "rcs-template": (rr, bb) => pvRcs(rr, bb, "template"), "rcs-message": (rr, bb) => pvRcs(rr, bb, "message") };
  checks[channel](r, body);
  const order = { error: 0, warning: 1, info: 2 };
  r.f.sort((a, b) => order[a.sev] - order[b.sev]);
  return { channel, f: r.f };
};

// Renders `code` spans inside finding text.
const PvText = ({ text }) => (
  <>{String(text).split(/(`[^`]+`)/g).map((part, i) => (part.startsWith("`") && part.endsWith("`") && part.length > 1
    ? <code key={i}>{part.slice(1, -1)}</code> : <span key={i}>{part}</span>))}</>
);

const PV_SEV = {
  error: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  info: "bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
};

export const PayloadValidator = () => {
  const [raw, setRaw] = useState(PV_SAMPLES.smsBroken);
  const [hint, setHint] = useState("auto");
  const [example, setExample] = useState(true);
  const res = useMemo(() => pvValidate(raw, hint), [raw, hint]);
  const counts = { error: 0, warning: 0, info: 0 };
  res.f.forEach((x) => { counts[x.sev] += 1; });

  const format = () => {
    try {
      const big = [];
      const safe = raw.replace(/(:\s*|[\[,]\s*)(-?\d{16,})(?=\s*[,}\]])/g, (m0, pre, n) => { big.push(n); return pre + `"__BIG${big.length - 1}__"`; });
      setRaw(JSON.stringify(JSON.parse(safe), null, 2).replace(/"__BIG(\d+)__"/g, (m0, i) => big[Number(i)]));
    } catch (e) { /* leave invalid JSON as it is; the findings explain why */ }
  };
  const load = (key) => { setRaw(pvSample(key)); setHint("auto"); setExample(false); };

  const verdict = res.empty ? "Nothing to check"
    : counts.error ? `${counts.error === 1 ? "1 problem" : counts.error + " problems"} to fix`
    : counts.warning ? "Valid, with warnings" : "Valid";
  const verdictTone = res.empty ? "text-gray-500" : counts.error ? "text-red-600 dark:text-red-400" : counts.warning ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-400";

  return (
    <div className="not-prose my-6 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
        <label htmlFor="pv-api" className="text-sm text-gray-600 dark:text-gray-300">API</label>
        <select id="pv-api" value={hint} onChange={(e) => setHint(e.target.value)}
          className="text-sm rounded-md border border-gray-300 dark:border-white/15 bg-white dark:bg-gray-900 px-2 py-1 text-gray-900 dark:text-gray-100">
          <option value="auto">Detect from the payload</option>
          {Object.keys(PV_LABEL).map((k) => <option key={k} value={k}>{PV_LABEL[k]}</option>)}
        </select>
        <button type="button" onClick={format}
          className="text-sm rounded-md border border-gray-300 dark:border-white/15 px-3 py-1 text-gray-800 dark:text-gray-100 hover:border-gray-500">Format</button>
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">Samples:</span>
        {["sms", "intl", "wa-template", "wa-session", "rcs-template", "rcs-message"].map((k) => (
          <button key={k} type="button" onClick={() => load(k)}
            className="text-xs rounded-md border border-gray-300 dark:border-white/15 px-2 py-1 text-gray-700 dark:text-gray-200 hover:border-gray-500">{PV_LABEL[k]}</button>
        ))}
      </div>
      {example && (
        <p className="m-0 px-4 py-2 text-xs text-amber-800 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10 border-b border-gray-200 dark:border-white/10">
          Example payload with deliberate mistakes. Paste your own to replace it.
        </p>
      )}
      <div className="flex flex-col">
        <textarea id="pv-body" aria-label="Request body JSON" spellCheck={false} wrap="off" value={raw}
          onChange={(e) => { setRaw(e.target.value); setExample(false); }}
          className="w-full min-h-[340px] p-4 font-mono text-[13px] leading-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-0 border-b border-gray-200 dark:border-white/10 resize-y focus:outline-none overflow-x-auto" />
        <div className="min-w-0" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-white/10">
            <span className={`font-semibold ${verdictTone}`}>{verdict}</span>
            {counts.error > 0 && <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${PV_SEV.error}`}>{counts.error} error{counts.error > 1 ? "s" : ""}</span>}
            {counts.warning > 0 && <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${PV_SEV.warning}`}>{counts.warning} warning{counts.warning > 1 ? "s" : ""}</span>}
            {counts.info > 0 && <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${PV_SEV.info}`}>{counts.info} note{counts.info > 1 ? "s" : ""}</span>}
            {res.channel && <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">Checked as {PV_LABEL[res.channel]}</span>}
          </div>
          {res.empty && <p className="m-0 px-4 py-6 text-sm text-gray-500 dark:text-gray-400">Paste a request body, or load a sample.</p>}
          {!res.empty && res.f.length === 0 && (
            <p className="m-0 px-4 py-6 text-sm text-gray-700 dark:text-gray-300"><strong className="text-emerald-700 dark:text-emerald-400">No problems found.</strong> The body matches the API reference and passes the checks the live API applies.</p>
          )}
          <ol className="m-0 p-0 list-none">
            {res.f.map((x, i) => (
              <li key={i} className="grid grid-cols-[68px_minmax(0,1fr)] gap-3 px-4 py-3 border-b last:border-b-0 border-gray-100 dark:border-white/5">
                <span className={`self-start text-center text-[10px] font-bold uppercase tracking-wider rounded px-1 py-0.5 ${PV_SEV[x.sev]}`}>{x.sev}</span>
                <div className="min-w-0 flex flex-col gap-1">
                  <span className="font-mono text-xs text-indigo-700 dark:text-indigo-300 break-all">{x.path}</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100"><PvText text={x.msg} /></span>
                  {x.api && <span className="text-xs text-gray-500 dark:text-gray-400"><PvText text={x.api} /></span>}
                  {x.doc && <a href={x.doc} className="text-xs text-indigo-700 dark:text-indigo-300 underline">API reference</a>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};
