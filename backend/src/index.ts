import { createApp } from "./app";

const app = createApp();
const port = Number(process.env.PORT || 5000);

app.listen(port, () => {
  console.log(`CRM backend listening on port ${port}`);
});
