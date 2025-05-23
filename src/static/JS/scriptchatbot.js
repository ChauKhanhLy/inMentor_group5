const apiKey = "app-b78TsFpOzdbiHxEg5rK5TwSy";
const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const sendButton = document.getElementById("send-button");
const startSection = document.getElementById("chat-start");
const endButton = document.getElementById("end-button"); 

endButton.addEventListener("click", function () {
  window.location.href = "trangchu"; // hoặc "trangchu.html" tùy theo cấu trúc
});

let conversationId = "";

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  const userMessage = input.value.trim();
  if (!userMessage) return;

  // Lấy giá trị lĩnh vực nghề nghiệp từ select
  const careerValue = careerSelect.value;

  appendMessage("user", userMessage);
  input.value = "";
  toggleSendButton(true);

  if (startSection) startSection.style.display = "none";

  // Truyền careerValue vào hàm gửi
  const aiReply = await sendMessageToDify(userMessage, careerValue);
  typeText("ai", aiReply, () => toggleSendButton(false));
  // Kiểm tra nếu là đánh giá tổng quan thì tách và gửi về backend
 if (
  aiReply.includes("ĐÁNH GIÁ ỨNG VIÊN") ||
  aiReply.includes("Mức độ phù hợp:")
) {
  const parsed = parseSummary(aiReply);
  console.log(parsed); // Xem kết quả tách

  if (parsed.score) {
    fetch("/api/save_summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed)
    }).then(() => {
      window.location.href = "/summary";
    });
  }
}
});



function appendMessage(sender, text) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${sender}`;
  messageEl.textContent = text;
  chatBox.appendChild(messageEl);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function typeText(sender, text, callback) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${sender}`;
  chatBox.appendChild(messageEl);

  let i = 0;
  const speed = 25;
  function typing() {
    if (i < text.length) {
      messageEl.textContent += text.charAt(i);
      i++;
      chatBox.scrollTop = chatBox.scrollHeight;
      setTimeout(typing, speed);
    } else {
      // Khi AI trả lời xong, kiểm tra nếu là câu kết thúc thì hiển thị nút "Kết thúc"
      if (
        text.includes("Kết thúc buổi phỏng vấn") ||
        text.includes("Cảm ơn bạn đã tham gia") ||
        text.toLowerCase().includes("phỏng vấn kết thúc")
      ) {
        endButton.style.display = "block";
      }

      if (callback) callback();
    }
  }
  typing();
}


function toggleSendButton(disabled) {
  sendButton.disabled = disabled;
  sendButton.textContent = disabled ? "Đang gửi..." : "Gửi";
}

function toggleDropdown() {
  const dropdown = document.getElementById('accountDropdown')
  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block'
}

document.addEventListener('click', function (event) {
  const dropdown = document.getElementById('accountDropdown')
  if (!event.target.closest('.account')) {
    dropdown.style.display = 'none'
  }
})

const careerSelect = document.getElementById("career-select");

careerValue = careerSelect.value;




async function sendMessageToDify(messageText, careerValue ) {
  let phienId = localStorage.getItem('interview_id'); // Lấy lại mỗi lần gửi
  try {
    const response = await fetch("http://127.0.0.1:5000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messageText,
        conversationId,
        inputs: { "abc": careerValue },  
        phien_id: phienId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.conversation_id) {
      conversationId = data.conversation_id;
    }

    // ✅ Gửi cặp câu hỏi – trả lời về backend để lưu
if (messageText.trim().toLowerCase() !== "bắt đầu") {
  fetch("/api/luu_cau_tra_loi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phien_id: phienId,
      cau_hoi: messageText,
      cau_tra_loi: data.answer || data.choices?.[0]?.message?.content || ""
    }),
  });
}

    return data.answer || data.choices?.[0]?.message?.content || "Không có phản hồi từ AI.";
  } catch (error) {
    console.error("Lỗi gửi tin nhắn đến service:", error);
    return "Đã xảy ra lỗi khi kết nối với service.";
  }
}

function parseSummary(summaryText) {
  // Lấy điểm số
  const scoreMatch = summaryText.match(/\*\*Mức độ phù hợp:\*\*\s*(\d+)\/100/);

  // Lấy điểm mạnh
  const strengthsMatch = summaryText.match(/\*\*Ưu điểm nổi bật:\*\*([\s\S]*?)\*\*Hạn chế cần cải thiện:\*\*/);

  // Lấy điểm hạn chế
  const weaknessesMatch = summaryText.match(/\*\*Hạn chế cần cải thiện:\*\*([\s\S]*?)\*\*Đề xuất tiếp theo:\*\*/);

  return {
    score: scoreMatch ? scoreMatch[1] : "",
    strengths: strengthsMatch ? strengthsMatch[1].replace(/^- /gm, '').trim() : "",
    weaknesses: weaknessesMatch ? weaknessesMatch[1].replace(/^- /gm, '').trim() : ""
  };
}