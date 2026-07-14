import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function QuizPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const docId = searchParams.get("doc");

  useEffect(() => {
    if (docId) {
      navigate(`/notebook/${docId}`, { replace: true });
    }
  }, [docId, navigate]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm animate-fadeIn">
        <div className="w-16 h-16 glass-card rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📝</span>
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Generate a Quiz</h2>
        <p className="text-gray-500 text-sm mb-6">
          Open a notebook to generate quizzes from your documents.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-2.5 rounded-xl btn-glow text-sm"
        >
          Go to My Notebooks
        </button>
      </div>
    </div>
  );
}
