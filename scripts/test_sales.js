fetch("http://localhost:3000/api/erp-auth/projects/b730590c-adcd-4e92-af82-bdf47db6424e/proj2-lots")
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data.lot_sales, null, 2)))
  .catch(err => console.error(err));
