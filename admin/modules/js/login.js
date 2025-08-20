class LoginBox extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        #login-box {
          max-width: 300px;
          margin: 5rem auto;
          padding: 2rem;
          border: 1px solid #ccc;
          border-radius: 8px;
          text-align: center;
          font-family: sans-serif;
          background: #fafafa;
        }
        input, button {
          margin: 0.5rem 0;
          padding: 0.5rem;
          width: 100%;
        }
        p {
          color: red;
        }
      </style>
      <div id="login-box">
        <h2>Acceso restringido</h2>
        <input type="password" id="password" placeholder="Contraseña" />
        <button id="btn-login">Entrar</button>
        <p id="msg"></p>
      </div>
    `;

    this.shadowRoot.getElementById("btn-login")
      .addEventListener("click", () => this.checkPassword());
  }

  checkPassword() {
    const pwd = this.shadowRoot.getElementById("password").value;
    const msg = this.shadowRoot.getElementById("msg");

    // ⚡ acá podés reemplazar la validación hardcodeada por tu API o backend
    if (pwd === "TuClaveSecreta123") {
      msg.textContent = "";
      this.dispatchEvent(new CustomEvent("loginSuccess", { bubbles: true }));
    } else {
      msg.textContent = "Contraseña incorrecta";
    }
  }
}

customElements.define("login-box", LoginBox);
