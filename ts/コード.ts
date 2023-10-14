function doGet(e: GoogleAppsScript.Events.DoGet): any {
  Logger.log("doGet:" + JSON.stringify(e.parameter));

  // LINKで開かれたページを返す(?page=html名 のパラメータで指定させる)
  let page = e.parameter["page"];
  if (page == null) {
    //pageの指定のない時はデフォルトで"index.html"を開く
    page = "index";
  }
  return HtmlService.createTemplateFromFile(page).evaluate()
    .addMetaTag('viewport', 'initial-scale=0.4, user-scalable=no');
}

// CSSやjavascriptをインクルードさせる
function include(filename: string) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// サイトのURLを返す
function thisUrl() {
  return ScriptApp.getService().getUrl();
}

// 前回の総走行距離を返す
function lastDistance() {
  // スプレッドシートを開く
  const sheetId =
    PropertiesService.getScriptProperties().getProperty("FUEL_DATA_SHEET") ?? "";
  const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  const lastRow = sheet.getLastRow();
  return sheet.getRange("D" + lastRow).getValue();
}

function postToServer(postString: string): string {
  Logger.log(`postToServer: ${postString}`);
  // json形式で送信されたデータをobjectに変換して取得
  const postData = JSON.parse(postString);

  switch (postData.page) {
    case "fuel":
      return fuelData(postData);
    case "medicine":
      return medicineData(postData);
    default:
      return "";
  }
}

function fuelData(postData: any): string {
  try {
    // スプレッドシートを開く
    const sheetId = PropertiesService.getScriptProperties().getProperty("FUEL_DATA_SHEET") ?? "";
    const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
    // 最終行を下にコピー
    let lastRow = sheet.getLastRow();
    const srcRange = sheet.getRange(lastRow, 1, 1, 100);
    const dstRange = sheet.getRange(lastRow + 1, 1);
    srcRange.copyTo(dstRange);
    lastRow++;
    sheet.getRange("B" + lastRow).setValue(new Date());
    sheet.getRange("C" + lastRow).setValue(postData.date);
    sheet.getRange("D" + lastRow).setValue(postData.distance);
    sheet.getRange("F" + lastRow).setValue(postData.pricePerLiter);
    sheet.getRange("G" + lastRow).setValue(postData.fuelAmount);
    sheet.getRange("H" + lastRow).setValue(postData.totalPrice);
    sheet.getRange("J" + lastRow).clearContent();
    if (postData.fuelType !== "true") {
      //限定給油
      sheet.getRange("J" + lastRow).setValue(true);
      return `今回の燃費は満タンでないため計算できません`;
    } else {
      const f = Math.round(sheet.getRange("I" + lastRow).getValue() * 100) / 100;
      return `今回の燃費は ${f} km/L でした`;
    }
  } catch (error) {
    return "データの追加中にエラーが発生しました。";
  }
}

function medicineData(postData: any): string {
  try {
    // スプレッドシートを開く
    const sheetId = PropertiesService.getScriptProperties().getProperty("MEDICINE_DATA_SHEET") ?? "";
    const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
    // 最終行を下にコピー
    let lastRow = sheet.getLastRow();
    const srcRange = sheet.getRange(lastRow, 1, 1, 100);
    const dstRange = sheet.getRange(lastRow + 1, 1);
    srcRange.copyTo(dstRange);
    lastRow++;
    sheet.getRange("B" + lastRow).setValue(new Date());
    sheet.getRange("C" + lastRow).setValue(postData.date);
    sheet.getRange("D" + lastRow).setValue(postData.medicine);
    sheet.getRange("E" + lastRow).setValue(postData.quantity);
    sheet.getRange("F" + lastRow).setValue(postData.symptom);
    sheet.getRange("G" + lastRow).setValue(postData.memo);
    return `データを１件追加しました。`;
  } catch (error) {
    return "データの追加中にエラーが発生しました。";
  }
}
