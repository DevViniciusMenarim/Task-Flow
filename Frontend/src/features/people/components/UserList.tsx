import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { usePagedUsers } from "../hooks/usePagedUsers";
import type { User } from "../types";
import { UserForm } from "./UserForm";
import { PageHeading } from "../../../shared/ui/PageHeading";
import { Pagination } from "../../../shared/ui/Pagination";
import { RetryButton } from "../../../shared/ui/RetryButton";

export function UserList() {
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const creating = searchParams.get("cadastrar") === "1";
  const [notice, setNotice] = useState("");
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const { result, lastResult, loading, error } = usePagedUsers(q, page, refreshKey, setPage, "Falha ao carregar pessoas.");

  const setCreating = (value: boolean) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set("cadastrar", "1");
      else next.delete("cadastrar");
      return next;
    }, { replace: true });
  };

  useEffect(() => { if (notice) noticeRef.current?.focus(); }, [notice]);
  const paginationResult = result ?? lastResult;
  const totalPages = Math.max(1, paginationResult?.totalPages ?? 1);
  const showPagination = Boolean(paginationResult?.items.length);
  const unavailable = loading || Boolean(error);

  const created = (user: User) => {
    setDraft(user.name);
    setQ(user.name);
    setPage(1);
    setRefreshKey((value) => value + 1);
    setCreating(false);
    setNotice(`${user.name} foi cadastrado.`);
  };

  return (
    <div className="list-panel">
      <PageHeading
        eyebrow="Equipe"
        title="Pessoas"
        description="Cadastre e acompanhe as pessoas que participam das tarefas."
        action={<button type="button" className={creating ? "button-secondary" : "button-primary"} aria-expanded={creating} aria-controls={creating ? "people-create" : undefined} onClick={() => { setCreating(!creating); setNotice(""); }}>{creating ? "Fechar cadastro" : "Cadastrar pessoa"}</button>}
      />
      {creating && <div id="people-create" className="people-create"><UserForm onUserCreated={created} /></div>}
      {notice && <p ref={noticeRef} className="form-message" role="status" tabIndex={-1}>{notice}</p>}
      <form className="panel search-panel user-search" aria-label="Buscar pessoas" onSubmit={(event) => { event.preventDefault(); setQ(draft.trim()); setPage(1); }}>
        <div className="search-panel-heading"><h2>Encontre alguém da equipe</h2></div>
        <label htmlFor="users-query">Buscar por nome ou e-mail</label>
        <input id="users-query" type="search" maxLength={150} placeholder="Nome ou e-mail" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button type="submit">Buscar</button>
      </form>
      {loading && <p className="loading-state" role="status">Carregando pessoas...</p>}
      {error && <div className="load-error" role="alert"><p>{error}</p><RetryButton onClick={() => setRefreshKey((value) => value + 1)} /></div>}
      {!loading && !error && result?.items.length === 0 && <div className="panel empty-state"><span className="empty-state-icon" aria-hidden="true">+</span><h2>Nenhuma pessoa encontrada.</h2><p>Cadastre alguém ou tente outra busca.</p>{!creating && <button type="button" className="button-primary" onClick={() => setCreating(true)}>Cadastrar pessoa</button>}</div>}
      {!loading && !error && result && result.items.length > 0 && (
        <>
          <p className="result-count" role="status">{result.totalCount} {result.totalCount === 1 ? "pessoa encontrada" : "pessoas encontradas"}</p>
          <ul className="user-list">{result.items.map((user) => <li key={user.id} className="panel user-card"><span className="user-avatar" aria-hidden="true">{user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><span className="user-details"><strong>{user.name}</strong><span>{user.email}</span></span></li>)}</ul>
        </>
      )}
      {showPagination && <Pagination label="Páginas de pessoas" page={page} totalPages={totalPages} unavailable={unavailable} onPageChange={setPage} />}
    </div>
  );
}
