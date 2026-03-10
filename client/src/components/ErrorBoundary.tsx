import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[client] unhandled render error", { error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#030914] text-slate-100 flex items-center justify-center px-6">
          <div className="w-full max-w-lg rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-8 shadow-[0_20px_60px_-35px_rgba(8,145,178,0.65)] backdrop-blur">
            <h1 className="text-2xl font-semibold tracking-tight">Une erreur est survenue</h1>
            <p className="mt-3 text-slate-300">L'application a rencontré une erreur inattendue. Recharge la page pour reprendre.</p>
            <button
              className="mt-6 rounded-xl bg-cyan-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-300"
              onClick={() => window.location.reload()}
              type="button"
            >
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
