import { useNavigate } from "react-router-dom";
import ChatBot from "../components/ChatBot.jsx";

export default function ChatBotPage() {
  const navigate = useNavigate();

  return <ChatBot onClose={() => navigate("/")} />;
}
