import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  fallbackTo?: string;
  label?: string;
  to?: string;
}

function getHistoryIndex() {
  const state = window.history.state as unknown;

  if (!state || typeof state !== "object" || !("idx" in state)) {
    return 0;
  }

  const index = (state as Record<string, unknown>).idx;
  return typeof index === "number" ? index : 0;
}

export function BackButton({ fallbackTo = "/", label = "Go back", to }: BackButtonProps) {
  const navigate = useNavigate();

  function goBack() {
    if (to) {
      void navigate(to);
      return;
    }

    const historyIndex = getHistoryIndex();
    if (historyIndex > 0) {
      void navigate(-1);
      return;
    }
    void navigate(fallbackTo);
  }

  return (
    <button aria-label={label} className="page-back-button" onClick={goBack} type="button">
      <ArrowBackRoundedIcon aria-hidden="true" />
    </button>
  );
}
