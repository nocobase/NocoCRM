<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/nococrm-logo-dark.svg">
    <img src="images/nococrm-logo.svg" width="240" alt="NocoCRM">
  </picture>
</h1>

<p align="center"><strong>Tus ventas ya tienen un equipo de agentes 24/7.</strong></p>

<p align="center">CRM de código abierto para ventas B2B · Construido sobre NocoBase</p>

<p align="center">
  <a href="../LICENSE.txt"><img src="https://img.shields.io/badge/license-NocoBase-blue" alt="NocoBase License"></a>
  <a href="https://github.com/nocobase/NocoCRM/tags"><img src="https://img.shields.io/github/v/tag/nocobase/NocoCRM?label=version&sort=semver&include_prereleases" alt="version"></a>
  <a href="https://www.nocobase.com"><img src="https://img.shields.io/badge/built%20on-NocoBase-1f6feb" alt="Built on NocoBase"></a>
</p>

<p align="center">
  <a href="https://solutions.nocobase.com/crm/"><strong>Pruébalo en línea</strong></a> · <a href="https://www.nocobase.com/es-ES/solution-crm/">Sitio web</a>
</p>

<p align="center">
  <a href="../README.MD">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja-JP.md">日本語</a> · <a href="README.ko-KR.md">한국어</a> · <a href="README.de-DE.md">Deutsch</a> · <a href="README.fr-FR.md">Français</a> · <strong>Español</strong> · <a href="README.pt-BR.md">Português</a> · <a href="README.ru-RU.md">Русский</a> · <a href="README.id-ID.md">Bahasa Indonesia</a> · <a href="README.vi-VN.md">Tiếng Việt</a>
</p>

NocoCRM es un CRM de código abierto para ventas B2B, construido sobre [NocoBase](https://www.nocobase.com). Incluye 6 agentes de ventas e integra tu correo y WhatsApp: hacen seguimiento de leads y oportunidades, responden los mensajes al instante y revisan contigo las aprobaciones. Los agentes sugieren; tú decides.

https://github.com/user-attachments/assets/d56b50ed-a7f6-4012-95ee-7eece46d4271

## Funcionalidades

- **Seguimiento automático.** Un lead o una oportunidad nuevos, la respuesta de un cliente, una tarea terminada, la revisión de la mañana: un agente lee todo el contexto y deja el siguiente paso en tu bandeja de entrada, con su recomendación, su confianza y sus razones. Los registros solo cambian cuando aceptas.
- **Todos los canales en una sola línea de tiempo.** Cada persona conecta su propio buzón (Gmail, Microsoft 365 o cualquier servidor IMAP/SMTP) y la empresa su número de WhatsApp Business. Los mensajes se vinculan a leads y contactos, y las respuestas se redactan para salir desde tu propia cuenta.
- **6 agentes de ventas.** Sales Expert para conversar desde cualquier página, además de cinco que trabajan en segundo plano: seguimiento de leads, seguimiento de oportunidades, revisión de aprobaciones, preparación de tareas e investigación de empresas, cada uno con sus disparadores, sus habilidades y un registro de sus ejecuciones.
- **Registro inteligente.** Pega un correo, un chat o una tarjeta de visita: la IA lo compara con los registros existentes y lo convierte en leads o en una oportunidad, que revisas antes de guardar. Para una empresa nueva basta con el nombre: la IA completa sus datos desde la web. Los leads duplicados se detectan y se fusionan.
- **Señales de empresas.** Cada mañana, la investigación de empresas busca en la web noticias de las empresas con oportunidades abiertas o que sigues: rondas de financiación, contrataciones, cambios en la dirección, movimientos del negocio y riesgos, con sus fuentes. Una señal importante pone en marcha el seguimiento de sus oportunidades abiertas.
- **Las aprobaciones ya no se atascan.** El agente de aprobaciones contrasta un descuento o una condición con tus reglas y decisiones anteriores, y redacta una recomendación y un comentario para quien aprueba.
- **Todo el ciclo de ventas.** Leads, empresas, contactos, oportunidades, tareas, aprobaciones e informes, con un tablero de oportunidades, un calendario de tareas, búsqueda en todos los registros (⌘K / Ctrl+K) y roles que el servidor aplica registro a registro.
- **Personalizable.** Escribe tus precios, límites de descuento y ritmo de seguimiento en texto llano en las directrices de negocio, y todos los agentes las siguen; el método de cada agente es una habilidad que puedes editar. El código es abierto, así que un agente de programación puede cambiar el resto.
- **Autoalojado.** Tus datos se quedan en tus servidores, con los modelos que elijas: DeepSeek, OpenAI, Claude, Gemini, Qwen y otros.

## Inicio rápido

¿Solo quieres echar un vistazo? [Pruébalo en línea](https://solutions.nocobase.com/crm/): entras con una cuenta de demostración y todos los datos son inventados.

### 1. Instalar

**Con un agente de programación.** La forma más fácil. Abre Claude Code, Codex o Cursor en la carpeta donde irá NocoCRM y dale esto:

```text
Instala NocoCRM desde https://github.com/nocobase/NocoCRM e inícialo, siguiendo el AGENTS.md y el README del repositorio.
```

**A mano.** Necesitas Node.js 24 o posterior y pnpm 11 (`corepack enable`). Los datos se guardan por defecto en un archivo SQLite; PostgreSQL y MySQL también funcionan.

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. Iniciar sesión

Abre la dirección `Local:` que muestra `pnpm dev`, normalmente `http://127.0.0.1:13000/main/`, e inicia sesión como `nocobase` con la contraseña `admin123`.

### 3. Importar los datos de demostración

El banner de la parte superior los ofrece, o abre **Configuración → Datos de demostración**. Traen un equipo de ventas con clientes, oportunidades, tareas, aprobaciones, correo y conversaciones; elimínalos en esa misma página cuando empieces de verdad.

### 4. Configurar un modelo de IA

Añade un servicio de modelos con su clave en **Equipo de Agents → Modelos**, por ejemplo DeepSeek, OpenAI, Claude, Gemini o Qwen. El asistente y los agentes lo necesitan; todo lo demás funciona sin él.

La [guía](guide.md) (en inglés) cubre los siguientes pasos, las cuentas de demostración, los roles, la configuración (IA, correo, WhatsApp, bases de datos), el despliegue y el desarrollo.

Para producción, consulta [Despliegue](guide.md#deployment); para PostgreSQL y MySQL, consulta [Configuración](guide.md#configuration).

## Licencia

NocoCRM está construido sobre NocoBase y se publica bajo la [licencia de NocoBase](../LICENSE.txt).
