// src/components/AddRecordModal.tsx
import Modal from './ui/Modal'
import RecordForm from './RecordForm'

type AddRecordModalProps = {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function AddRecordModal({ open, onClose, onCreated }: AddRecordModalProps) {
  return (
    <Modal open={open} title="Nuovo movimento" onClose={onClose}>
      <RecordForm onSubmitted={onCreated} />
    </Modal>
  )
}
