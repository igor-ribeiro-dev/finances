import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCreditCards } from '../hooks/useCreditCards';
import { CreditCardList } from '../components/credit-cards/CreditCardList';
import { CreditCardFormModal } from '../components/credit-cards/CreditCardFormModal';
import { CreditCardDetail } from '../components/credit-cards/CreditCardDetail';
import { RegisterFaturaModal } from '../components/credit-cards/RegisterFaturaModal';
import type { CreditCard, CreditCardServiceError, FieldError } from '../types/credit-card';

export function CreditCardsPage() {
  const { cards, isLoading, error, refresh, createCard, updateCard, archiveCard, deleteCard } =
    useCreditCards();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCard | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [faturaCardId, setFaturaCardId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setFieldErrors([]);
    setModalOpen(true);
  }

  function openEdit(card: CreditCard) {
    setEditing(card);
    setFieldErrors([]);
    setModalOpen(true);
  }

  async function handleSubmit(payload: { name: string; closingDay: number }) {
    setIsSaving(true);
    setFieldErrors([]);
    try {
      if (editing) {
        await updateCard(editing.id, payload);
      } else {
        await createCard(payload);
      }
      setModalOpen(false);
    } catch (err) {
      const e = err as CreditCardServiceError;
      if (e.kind === 'validation') setFieldErrors(e.fieldErrors);
      else setBanner(e.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive(card: CreditCard) {
    setBanner(null);
    try {
      await archiveCard(card.id);
    } catch (err) {
      setBanner((err as CreditCardServiceError).message);
    }
  }

  async function handleDelete(card: CreditCard) {
    setBanner(null);
    if (!window.confirm(`Excluir o cartão "${card.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await deleteCard(card.id);
    } catch (err) {
      // credit_card.has_bills → tell the user to archive instead
      setBanner((err as CreditCardServiceError).message);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fg">Cartões de Crédito</h1>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          <Plus size={16} />
          Novo cartão
        </button>
      </div>

      {banner && (
        <div className="mb-4 rounded-md border border-amber-200 bg-accent/10 p-3 text-sm text-amber-800">
          {banner}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-fg-muted">Carregando…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error.message}</p>
      ) : (
        <CreditCardList
          cards={cards}
          onEdit={openEdit}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onOpen={(card) => setDetailCardId(card.id)}
        />
      )}

      <CreditCardFormModal
        open={modalOpen}
        mode={editing ? 'edit' : 'create'}
        initial={editing ? { name: editing.name, closingDay: editing.closingDay } : undefined}
        isSaving={isSaving}
        fieldErrors={fieldErrors}
        onSubmit={handleSubmit}
        onCancel={() => setModalOpen(false)}
      />

      {detailCardId && (
        <CreditCardDetail
          cardId={detailCardId}
          onClose={() => setDetailCardId(null)}
          onRegisterFatura={(d) => {
            setDetailCardId(null);
            setFaturaCardId(d.id);
          }}
        />
      )}

      {faturaCardId && (
        <RegisterFaturaModal
          cardId={faturaCardId}
          onClose={() => setFaturaCardId(null)}
          onSuccess={() => {
            setFaturaCardId(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}
