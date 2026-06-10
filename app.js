const demoAudio = document.getElementById("demoAudio");
const playButtons = [document.getElementById("playHero"), document.getElementById("playStudio")].filter(Boolean);

playButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!demoAudio) return;

    try {
      if (demoAudio.paused) {
        await demoAudio.play();
        playButtons.forEach((item) => {
          if (item.id === "playStudio") item.textContent = "Playing";
        });
      } else {
        demoAudio.pause();
        playButtons.forEach((item) => {
          if (item.id === "playStudio") item.textContent = "Jam";
        });
      }
    } catch {
      demoAudio.controls = true;
    }
  });
});

if (demoAudio) {
  demoAudio.addEventListener("ended", () => {
    playButtons.forEach((item) => {
      if (item.id === "playStudio") item.textContent = "Jam";
    });
  });
}

const optionInputs = Array.from(document.querySelectorAll(".option input"));
const rawTotal = document.getElementById("rawTotal");
const finalTotal = document.getElementById("finalTotal");
const discountMsg = document.getElementById("discountMsg");
const barFill = document.getElementById("barFill");

function formatPrice(value) {
  return `¥${value.toLocaleString("zh-CN")}`;
}

function discountFor(total) {
  if (total >= 2400) return 0.16;
  if (total >= 1900) return 0.12;
  if (total >= 1500) return 0.08;
  return 0;
}

function nextTier(total) {
  if (total < 1500) return { need: 1500 - total, label: "8% 早鸟折扣" };
  if (total < 1900) return { need: 1900 - total, label: "12% 创作者折扣" };
  if (total < 2400) return { need: 2400 - total, label: "16% Studio 折扣" };
  return null;
}

function updateBuilder() {
  if (!optionInputs.length || !finalTotal) return;

  const total = optionInputs.reduce((sum, input) => {
    return input.checked ? sum + Number(input.dataset.price || 0) : sum;
  }, 0);
  const rate = discountFor(total);
  const final = Math.round(total * (1 - rate));
  const saved = total - final;
  const tier = nextTier(total);

  finalTotal.textContent = formatPrice(final);

  if (rawTotal) {
    rawTotal.textContent = formatPrice(total);
    rawTotal.style.display = rate > 0 ? "inline" : "none";
  }

  if (discountMsg) {
    if (tier) {
      const prefix = rate > 0 ? `已节省 ${formatPrice(saved)}。` : "已包含早鸟价。";
      discountMsg.textContent = `${prefix} 再加 ${formatPrice(tier.need)} 解锁 ${tier.label}。`;
    } else {
      discountMsg.textContent = `已解锁最高折扣，当前节省 ${formatPrice(saved)}。`;
    }
  }

  if (barFill) {
    barFill.style.width = `${Math.min(100, Math.round((total / 2400) * 100))}%`;
  }
}

optionInputs.forEach((input) => input.addEventListener("change", updateBuilder));
updateBuilder();
