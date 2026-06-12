import { UserList } from "./components/UserList";
import { TaskList } from "./components/TaskList";

function App() {
  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <header
        style={{
          padding: "20px",
          backgroundColor: "#1a1a2e",
          color: "#fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px" }}>🚀 TaskFlow Dashboard</h1>
      </header>

      <main
        style={{
          display: "flex",
          flexWrap: "wrap",
          maxWidth: "1200px",
          margin: "20px auto",
          width: "100%",
          gap: "20px",
        }}
      >
        <div style={{ flex: "1", minWidth: "300px" }}>
          <UserList />
        </div>

        <div style={{ flex: "2", minWidth: "400px" }}>
          <TaskList />
        </div>
      </main>
    </div>
  );
}

export default App;
