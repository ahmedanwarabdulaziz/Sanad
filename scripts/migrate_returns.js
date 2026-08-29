const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// We will run this script with: node --env-file=.env.local scripts/migrate_returns.js

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function migrate() {
  console.log("Fetching expenses linked to investors (استرداد من مستثمر)...");

  // 1. Fetch all expenses with a recoverable_investor_id
  const { data: expenses, error: fetchError } = await supabase
    .from("sz_expenses")
    .select("*")
    .not("recoverable_investor_id", "is", null);

  if (fetchError) {
    console.error("Error fetching expenses:", fetchError);
    return;
  }

  console.log(`Found ${expenses.length} records to migrate.\n`);

  for (const exp of expenses) {
    console.log(`Processing: ${exp.description} (Allocated: ${exp.allocated_cost}, Paid: ${exp.actual_paid_amount})`);

    // 2. Fetch associated treasury transactions (the payments made so far)
    const { data: txs, error: txError } = await supabase
      .from("sz_treasury_transactions")
      .select("*")
      .eq("expense_id", exp.id);

    if (txError) {
      console.error(`  [!] Error fetching treasury txs for expense ${exp.id}:`, txError);
      continue;
    }

    if (txs && txs.length > 0) {
      // 3. Update existing treasury transactions to the new format
      for (const tx of txs) {
        const { error: updateError } = await supabase
          .from("sz_treasury_transactions")
          .update({
            reason_type: "CREDIT_REFUND",
            description: `مرحل من النظام القديم - ${exp.description}`
          })
          .eq("id", tx.id);
          
        if (updateError) {
          console.error(`  [!] Error updating tx ${tx.id}:`, updateError);
        } else {
          console.log(`  [✓] Updated treasury transaction ${tx.id} to CREDIT_REFUND`);
        }
      }
    } else {
      console.log(`  [!] Warning: This expense had no payments recorded yet. It will be deleted.`);
    }

    // 4. Delete the expense (This cascades and deletes sz_expense_payments automatically,
    // and sets expense_id to null in sz_treasury_transactions)
    const { error: deleteError } = await supabase
      .from("sz_expenses")
      .delete()
      .eq("id", exp.id);

    if (deleteError) {
      console.error(`  [!] Error deleting expense ${exp.id}:`, deleteError);
    } else {
      console.log(`  [✓] Deleted expense record ${exp.id} successfully.`);
    }
    console.log("---------------------------------------------------");
  }

  console.log("\nMigration completed successfully! All investor returns are now isolated in the treasury.");
}

migrate().catch(console.error);
