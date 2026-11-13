(() => {
  "use strict";

  const CORE_DIR = "../ffmpeg-build-output/dist/";
  const fileInput = document.getElementById("videoFile");
  const runButton = document.getElementById("runButton");
  const status = document.getElementById("status");
  const logElement = document.getElementById("log");
  const downloadLink = document.getElementById("downloadLink");

  let corePromise;
  let downloadUrl;

  function writeLog(message) {
    const line = String(message);
    logElement.textContent = logElement.textContent
      ? logElement.textContent + "\n" + line
      : line;
    logElement.scrollTop = logElement.scrollHeight;
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function removeVirtualFile(fs, path) {
    try {
      fs.unlink(path);
    } catch {
      // The file may not exist yet; cleanup is best-effort.
    }
  }

  async function getCore() {
    if (!corePromise) {
      if (typeof createFFmpegCore !== "function") {
        throw new Error("ffmpeg-core.js မတင်နိုင်ပါ။ Core JS ဖိုင်လမ်းကြောင်းကို စစ်ပါ။");
      }

      corePromise = createFFmpegCore({
        locateFile(path) {
          return CORE_DIR + path;
        }
      }).then((instance) => {
        instance.setLogger(({ type, message }) => {
          if (message) writeLog("[" + type + "] " + message);
        });
        return instance;
      }).catch((error) => {
        corePromise = undefined;
        throw error;
      });
    }

    return corePromise;
  }

  function validateAdts(bytes) {
    return bytes.length >= 7 &&
      bytes[0] === 0xff &&
      (bytes[1] & 0xf0) === 0xf0;
  }

  async function runTest() {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      setStatus("Video ဖိုင်ကို အရင်ရွေးပါ။");
      return;
    }

    runButton.disabled = true;
    downloadLink.hidden = true;
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      downloadUrl = undefined;
    }

    logElement.textContent = "";
    setStatus("FFmpeg Core စတင်နေပါသည်...");
    writeLog("Input size: " + file.size + " bytes");
    writeLog("Input MIME: " + (file.type || "မသတ်မှတ်ထား"));

    const inputPath = "/runtime-test-input";
    const outputPath = "/runtime-test-output.aac";
    let fs;

    try {
      const core = await getCore();
      fs = core.FS;
      if (!fs || typeof fs.writeFile !== "function" ||
          typeof fs.readFile !== "function" ||
          typeof fs.unlink !== "function") {
        throw new Error("လိုအပ်သော FS API များ မရရှိပါ။");
      }

      setStatus("Video ကို Browser Memory ထဲ ထည့်နေပါသည်...");
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      removeVirtualFile(fs, inputPath);
      removeVirtualFile(fs, outputPath);
      fs.writeFile(inputPath, inputBytes);
      writeLog("FS.writeFile အောင်မြင်ပါသည်။");

      setStatus("FFmpeg ဖြင့် AAC Audio ထုတ်ယူနေပါသည်...");
      const exitCode = core.exec(
        "-i", inputPath,
        "-map", "0:a:0",
        "-vn",
        "-c:a", "aac",
        "-f", "adts",
        outputPath
      );

      if (exitCode !== 0) {
        throw new Error("FFmpeg အလုပ်မအောင်မြင်ပါ။ Exit code: " + exitCode);
      }
      writeLog("FFmpeg exit code: " + exitCode);

      const outputBytes = fs.readFile(outputPath);
      if (!validateAdts(outputBytes)) {
        throw new Error("Output ဖိုင်သည် မှန်ကန်သော AAC/ADTS Header မဟုတ်ပါ။");
      }

      const outputBlob = new Blob([outputBytes], { type: "audio/aac" });
      downloadUrl = URL.createObjectURL(outputBlob);
      downloadLink.href = downloadUrl;
      downloadLink.download = "extracted-audio.aac";
      downloadLink.hidden = false;

      writeLog("FS.readFile အောင်မြင်ပါသည်။");
      writeLog("Output size: " + outputBytes.length + " bytes");
      writeLog("AAC/ADTS Header စစ်ဆေးမှု အောင်မြင်ပါသည်။");
      setStatus("အောင်မြင်ပါသည်။ AAC ဖိုင်ကို Download လုပ်ပြီး အသံဖွင့်စစ်ဆေးပါ။");
    } catch (error) {
      console.error("Runtime test failed:", error);
      writeLog("ERROR: " + (error && error.message ? error.message : error));
      setStatus("စမ်းသပ်မှု မအောင်မြင်ပါ။ Log ကို စစ်ဆေးပါ။");
    } finally {
      if (fs) {
        removeVirtualFile(fs, inputPath);
        removeVirtualFile(fs, outputPath);
        writeLog("Virtual FS ထဲရှိ ယာယီဖိုင်များ ရှင်းလင်းပြီးပါပြီ။");
      }
      runButton.disabled = false;
    }
  }

  runButton.addEventListener("click", runTest);
})();
