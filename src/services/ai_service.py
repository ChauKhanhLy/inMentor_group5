from flask import Blueprint, request, jsonify,session
import requests
from DAO.cau_hoi_tra_loi_dao import add_question_answer

ai_service_bp = Blueprint('ai_service', __name__)  # Tạo Blueprint cho AI service

API_KEY = ""

@ai_service_bp.route('/chat', methods=['POST'])
def chat():
    data = request.json
    print("==> Dữ liệu nhận được:", data)
    message_text = data.get('messageText')
    conversation_id = data.get('conversationId', '')
    inputs = data.get('inputs', {})
    phien_id = data.get("phien_id") or session.get("phien_id", None)  # Lấy phien_id từ session
    print(f"[LOG] phien_id dùng để lưu: {phien_id}")
    payload = {
        "query": message_text,
        "inputs": inputs,
        "response_mode": "blocking",
        "conversation_id": conversation_id,
        "user": "abc-123",
        "files": []
    }

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    response = requests.post(
        "https://api.dify.ai/v1/chat-messages",
        json=payload,
        headers=headers
    )
    response_json = response.json()
    # ✅ Lưu câu hỏi - trả lời nếu có phien_id và không phải "bắt đầu"
    if phien_id :
        ai_question = response_json.get("answer", "")
        user_answer = message_text
        if ai_question:
            try:
                # Lưu câu hỏi của AI
                add_question_answer(phien_id, ai_question, None)
                # Lưu câu trả lời của người dùng
                add_question_answer(phien_id, None, user_answer)
            except Exception as e:
                print("Lỗi khi lưu vào DB:", e)

    return jsonify(response_json), response.status_code

@ai_service_bp.route('/save_summary', methods=['POST'])
def save_summary():
    data = request.json
    session['score'] = data.get('score', '')
    session['strengths'] = data.get('strengths', '')
    session['weaknesses'] = data.get('weaknesses', '')
    return jsonify({"message": "Đã lưu đánh giá tổng quan!"}), 200