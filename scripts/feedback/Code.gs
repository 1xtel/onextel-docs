// Shared store for the docs feedback widget (feedback.js), as a Google Apps Script web app.
//
// Set up, once:
//   1. Create a Google Sheet. Extensions -> Apps Script, and paste this file in.
//   2. Deploy -> New deployment -> Web app. Execute as: Me. Who has access: Anyone.
//   3. Copy the web app URL (it ends in /exec) into FEEDBACK_ENDPOINT in feedback.js.
//
// The sheet gets one row per note. Anyone who can load the docs site can read and add notes
// through this URL, so keep customer data and secrets out of feedback.

var SHEET = "Feedback";
var COLUMNS = ["id", "createdAt", "status", "page", "title", "heading", "kind", "quote", "comment", "name"];
var LIMITS = { page: 300, title: 300, heading: 300, kind: 20, quote: 1000, comment: 4000, name: 120 };

function sheet_() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(SHEET) || book.insertSheet(SHEET);
  if (sheet.getLastRow() === 0) sheet.appendRow(COLUMNS);
  return sheet;
}

function rows_() {
  var values = sheet_().getDataRange().getValues();
  return values.slice(1).map(function (row) {
    var item = {};
    COLUMNS.forEach(function (column, index) {
      var value = row[index];
      item[column] = value instanceof Date ? value.toISOString() : String(value);
    });
    return item;
  });
}

function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

// Stops a cell that starts with = + - or @ from being read as a formula.
function text_(value, limit) {
  var text = String(value == null ? "" : value).slice(0, limit);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function doGet(event) {
  var page = (event.parameter.page || "").slice(0, LIMITS.page);
  var items = rows_().filter(function (item) {
    return !page || item.page === page;
  });
  return json_({ items: items });
}

function doPost(event) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var payload = JSON.parse(event.postData.contents);
    var sheet = sheet_();

    if (payload.action === "add") {
      var source = payload.item || {};
      if (!String(source.comment || "").trim() || !String(source.page || "").trim()) {
        return json_({ ok: false, error: "A page and a comment are required" });
      }
      var item = { id: Utilities.getUuid(), createdAt: new Date().toISOString(), status: "open" };
      Object.keys(LIMITS).forEach(function (key) {
        item[key] = text_(source[key], LIMITS[key]);
      });
      sheet.appendRow(COLUMNS.map(function (column) { return item[column]; }));
      return json_({ ok: true, item: item });
    }

    if (payload.action === "status") {
      var status = payload.status === "resolved" ? "resolved" : "open";
      var ids = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
      for (var row = 1; row < ids.length; row += 1) {
        if (ids[row][0] === payload.id) {
          sheet.getRange(row + 1, COLUMNS.indexOf("status") + 1).setValue(status);
          return json_({ ok: true, item: { id: payload.id, status: status } });
        }
      }
      return json_({ ok: false, error: "No note with that id" });
    }

    return json_({ ok: false, error: "Unknown action" });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}
