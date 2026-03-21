"use client";
import ContactsPage from "../components/ContactsPage";

export default function CustomersPage() {
  return (
    <ContactsPage
      type="customers"
      title="العملاء"
      emptyIcon="🤝"
      accentColor="#8b5cf6"
      accentBg="#7c3aed"
    />
  );
}
