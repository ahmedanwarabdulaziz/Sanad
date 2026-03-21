"use client";
import ContactsPage from "../components/ContactsPage";

export default function SuppliersPage() {
  return (
    <ContactsPage
      type="suppliers"
      title="الموردون"
      emptyIcon="🏭"
      accentColor="#f59e0b"
      accentBg="#d97706"
    />
  );
}
