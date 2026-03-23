fetch("http://localhost:3000/api/erp-auth/projects/b730590c-adcd-4e92-af82-bdf47db6424e/proj2-lots")
  .then(res => res.json())
  .then(data => {
    console.log("lot_sales_total:", data.lot_sales_total);
    console.log("lot_sales length:", data.lot_sales?.length);
    console.log("First sale:", data.lot_sales?.[0]);
  })
  .catch(console.error);
