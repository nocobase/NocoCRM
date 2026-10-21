import type { AppResource } from './en-US.js';
import { crmEsES } from './crm/es-ES.js';
import settingsEsES from './settings/es-ES.js';

// The pages in es-ES: the template's copy (./system/), the AI skills'
// display text and the CRM's own (./crm/es-ES.ts), with the same keys as
// ./en-US.ts. The template ships no es-ES, so its copy is translated
// here; a template upgrade that adds keys fails the type check until they
// are translated.
const esES: AppResource = {
  'auth.passwordResetSuccess':
    'Se ha restablecido tu contraseña. Inicia sesión con la nueva contraseña.',
  'auth.requestNewResetLink': 'Solicitar un nuevo enlace de restablecimiento',
  'auth.preparingSession': 'Preparando tu sesión…',
  'auth.connectionFailed': 'No se pudo conectar',
  'auth.connectionFailedDescription':
    'No se pudo preparar la conexión en tiempo real. Vuelve a intentarlo para entrar en la aplicación o cierra la sesión.',
  'deviceApproval.title': 'Autorizar un dispositivo',
  'deviceApproval.description':
    'Una línea de comandos u otro dispositivo ha solicitado iniciar sesión en tu nombre. Apruébalo solo si has iniciado tú mismo el inicio de sesión.',
  'deviceApproval.enterCode': 'Introduce el código que muestra tu dispositivo.',
  'deviceApproval.codeLabel': 'Código',
  'deviceApproval.continue': 'Continuar',
  'deviceApproval.checking': 'Comprobando el código…',
  'deviceApproval.confirm':
    'Comprueba que este código coincide con el que muestra tu dispositivo.',
  'deviceApproval.client': 'Solicitado por {{client}}',
  'deviceApproval.approve': 'Aprobar',
  'deviceApproval.approving': 'Aprobando…',
  'deviceApproval.deny': 'Denegar',
  'deviceApproval.denying': 'Denegando…',
  'deviceApproval.approved':
    'Dispositivo aprobado. Vuelve al terminal para continuar; puedes cerrar esta página.',
  'deviceApproval.denied':
    'Solicitud denegada. El dispositivo no ha iniciado sesión; puedes cerrar esta página.',
  'deviceApproval.expired':
    'Este código ha caducado. Vuelve a iniciar sesión desde tu dispositivo.',
  'deviceApproval.invalid':
    'Este código no es válido. Compáralo con el de tu dispositivo y vuelve a intentarlo.',
  'deviceApproval.notYours': 'Otra cuenta ya está aprobando este código.',
  'deviceApproval.error': 'Se ha producido un error. Vuelve a intentarlo.',
  'deviceApproval.retry': 'Volver a intentarlo',
  'deviceApproval.otherCode': 'Introducir otro código',
  'inbox.title': 'Bandeja de entrada',
  'inbox.description': 'Notificaciones y solicitudes que te han enviado.',
  'inbox.views.all': 'Notificaciones',
  'inbox.views.todo': 'Sugerencias de IA',
  'inbox.kinds.label': 'Tipo',
  'inbox.kinds.all': 'Todos los tipos',
  'inbox.kinds.decision': 'Decisiones',
  'inbox.kinds.info': 'Notificaciones',
  'inbox.tabs.decision': 'Pendiente de mi decisión',
  'inbox.tabs.info': 'Notificaciones',
  'inbox.clearFilter': 'Borrar filtro',
  'inbox.noMatchDescription': 'Borra el filtro para ver todos los tipos.',
  'inbox.readAll': 'Marcar todo como leído',
  'inbox.allRead': 'Todo marcado como leído.',
  'inbox.loading': 'Cargando',
  'inbox.loadFailed': 'No se puede cargar la bandeja de entrada',
  'inbox.loadFailedDescription': 'Comprueba tu conexión y vuelve a intentarlo.',
  'inbox.retry': 'Reintentar',
  'inbox.loadMore': 'Cargar más',
  'inbox.emptyAll': 'No hay nada aquí',
  'inbox.empty.todo': 'No tienes nada pendiente',
  'inbox.empty.decision': 'No tienes decisiones pendientes',
  'inbox.empty.info': 'No hay notificaciones',
  'inbox.emptyDescription':
    'Aquí aparecen las notificaciones y solicitudes que te envían.',
  'inbox.unread': 'No leídas',
  'inbox.unreadCount': '{{count}} sin leer',
  'inbox.pendingDecisions': '{{count}} pendientes',
  'inbox.resolved': 'Gestionado',
  'inbox.outcomes.approved': 'Aprobada',
  'inbox.outcomes.rejected': 'Rechazada',
  'inbox.outcomes.withdrawn': 'Retirada',
  'inbox.count': '×{{count}}',
  'inbox.actionsFor': 'Acciones de {{title}}',
  'inbox.actions.read': 'Marcar como leída',
  'inbox.actions.unread': 'Marcar como no leída',
  'inbox.actions.delete': 'Eliminar',
  'inbox.deleted': 'Eliminada.',
  'inbox.requestFailed': 'La solicitud ha fallado. Vuelve a intentarlo.',
  'inbox.forbidden': 'No tienes permiso para hacer esto.',
  'inbox.nothingSelected': 'Selecciona un elemento para verlo',
  'inbox.back': 'Volver a la lista',
  'inbox.open': 'Abrir',
  'inbox.keyMove': 'Mover',
  'inbox.keyOpen': 'Abrir',
  'inbox.cancel': 'Cancelar',
  'inbox.request.approve': 'Aprobar',
  'inbox.request.reject': 'Rechazar',
  'inbox.request.commentPlaceholder': 'Escribe algo…',
  'inbox.request.commentFor': '{{action}}: {{title}}',
  'inbox.request.quickSend': 'para enviar',
  'inbox.request.newLine': 'para nueva línea',
  'inboxButton.title': 'Bandeja de entrada',
  'inboxButton.pending': 'Bandeja de entrada, {{count}} pendientes',
  'inboxButton.unread': 'Bandeja de entrada, {{count}} sin leer',
  'inboxButton.pendingHint':
    '{{count}} pendientes de tu gestión; el número baja a medida que los gestionas.',
  'inboxButton.unreadHint':
    '{{count}} sin leer; el número baja a medida que los lees.',
  'auth.welcome': 'Te damos la bienvenida',
  'auth.loginDescription':
    'Inicia sesión con tu nombre de usuario o correo electrónico y tu contraseña.',
  'auth.registerTitle': 'Crear una cuenta',
  'auth.registerDescription': 'Crea una cuenta para empezar.',
  'auth.forgotTitle': 'He olvidado la contraseña',
  'auth.forgotDescription':
    'Introduce tu correo electrónico y, si la cuenta existe, te enviaremos un enlace de restablecimiento.',
  'auth.passwordResetUnavailable':
    'El restablecimiento de contraseña por autoservicio no está activado. Ponte en contacto con un administrador para restablecer tu contraseña.',
  'auth.capabilityLoadFailed':
    'No se ha podido comprobar si el restablecimiento de contraseña está disponible.',
  'auth.retry': 'Reintentar',
  'auth.loading': 'Cargando',
  'auth.resetDescription': 'Elige una nueva contraseña para tu cuenta.',
  'auth.resetTitle': 'Restablecer contraseña',
  'auth.identifier': 'Nombre de usuario o correo electrónico',
  'auth.password': 'Contraseña',
  'auth.signIn': 'Iniciar sesión',
  'auth.signingIn': 'Iniciando sesión…',
  'auth.hidePassword': 'Ocultar contraseña',
  'auth.showPassword': 'Mostrar contraseña',
  'auth.forgotLink': '¿Has olvidado la contraseña?',
  'auth.noAccount': '¿No tienes una cuenta?',
  'auth.signUp': 'Registrarse',
  'auth.createAccount': 'Crear cuenta',
  'auth.creatingAccount': 'Creando cuenta…',
  'auth.name': 'Nombre',
  'auth.username': 'Nombre de usuario',
  'auth.email': 'Correo electrónico',
  'auth.confirmPassword': 'Confirmar contraseña',
  'auth.existingAccount': '¿Ya tienes una cuenta?',
  'auth.passwordMismatch': 'Las contraseñas no coinciden.',
  'auth.resetting': 'Restableciendo…',
  'auth.newPassword': 'Nueva contraseña',
  'auth.confirmNewPassword': 'Confirmar nueva contraseña',
  'auth.invalidResetLink':
    'Este enlace de restablecimiento de contraseña no es válido o ha caducado.',
  'auth.backToSignIn': 'Volver a iniciar sesión',
  'auth.sendResetLink': 'Enviar enlace de restablecimiento',
  'auth.sending': 'Enviando…',
  'auth.resetSent':
    'Si la cuenta existe, se ha enviado un enlace de restablecimiento.',
  'auth.rememberPassword': '¿Recuerdas tu contraseña?',
  'auth.methods': 'Métodos de inicio de sesión',
  'auth.or': 'O continúa con',
  'auth.continueWith': 'Continuar con {provider}',
  'auth.about': 'Acerca de esta aplicación',
  'auth.platform': 'Plataforma de aplicaciones nativa de IA',
  'auth.marketingTitleFirst': 'Deja que la IA construya con libertad.',
  'auth.marketingTitleSecond': 'NocoBase lo mantiene',
  'auth.marketingTitleThird': 'fiable.',
  'auth.marketingDescription':
    'Dale a la IA un framework frontend flexible para dar forma a cada experiencia, mientras NocoBase protege los datos, los permisos y la gobernanza que hay debajo.',
  'auth.frontend': 'Frontend nativo de IA',
  'auth.frontendDescription':
    'Crea interfaces con libertad sobre un framework flexible.',
  'auth.foundation': 'Base de NocoBase',
  'auth.foundationDescription':
    'Datos, control de acceso y gobernanza fiables.',
  'auth.marketingFooter': 'Libertad arriba. Confianza abajo.',
  'status.loading': 'Cargando',
  'status.loadingPage': 'Cargando la página',
  'status.denied': 'Acceso denegado',
  'status.pageFailed': 'No se puede cargar la página',
  'status.retry': 'Reintentar',
  'navigation.brandHome': 'Inicio de NocoCRM',
  'navigation.brandApps': 'Aplicaciones de NocoBase',
  'routeOverlay.close': 'Cerrar',
  'status.deniedDescription': 'No tienes permiso para acceder a {{label}}.',
  'status.routeFailedDescription':
    'No se ha podido cargar la ruta {{label}} de {{packageName}}.',
  shell: {
    buildFreely: 'La IA construye con libertad.',
    reliability: '<brand>NocoBase</brand> lo mantiene fiable.',
  },
  home: {
    platform: 'NocoBase · Plataforma de aplicaciones nativa de IA',
    title: 'Descríbelo y tu Agent lo construye',
    description:
      'Esta aplicación se desarrolla conversando con tu Coding Agent. Cuéntale con palabras sencillas lo que necesita el negocio y escribirá las páginas, los modelos de datos, las API y los procesos de negocio en este proyecto.',
    steps: {
      describe: {
        title: 'Describe la necesidad',
        description:
          'Indica quién la usa, qué datos guarda y qué debe ocurrir.',
      },
      build: {
        title: 'Deja que el Agent construya',
        description:
          'Lee este proyecto y sus capacidades integradas y, después, escribe el código.',
      },
      review: {
        title: 'Revisa y ajusta',
        description:
          'Actualiza la página para probarlo y pide cambios de la misma forma.',
      },
    },
    example: {
      title: 'Prueba con una petición como esta',
      text: 'Crea una aplicación de pedidos de compra.\n\nUn pedido tiene un número, un artículo, un solicitante, un importe y un estado de aprobación. Los solicitantes crean pedidos y solo ven los suyos; los revisores ven todos los pedidos pendientes y los aprueban o rechazan.\nTras una decisión, notifica al solicitante en la bandeja de entrada con un enlace al pedido.',
      hint: 'Pégala en Claude Code, Codex, Cursor o cualquier Coding Agent abierto en este proyecto.',
    },
    capabilitiesTitle: 'Capacidades integradas',
    capabilitiesDescription:
      'Tu Agent las usa directamente en lugar de crearlas desde cero. Abre una para obtener un prompt que puedes editar y copiar.',
    viewPrompts: 'Ver prompts ({{count}})',
    prompt: {
      label: 'Prompt',
      hint: 'Edita el prompt para adaptarlo a tu negocio antes de copiarlo. Los cambios no se guardan al cerrar el cuadro de diálogo.',
      copy: 'Copiar',
      copiedShort: 'Copiado',
      copied: 'Prompt copiado',
      copyFailed:
        'No se puede copiar. Selecciona el texto y cópialo manualmente.',
      reset: 'Restaurar predeterminado',
    },
    capabilities: {
      auth: {
        title: 'Autenticación',
        description:
          'Inicio de sesión, registro, restablecimiento de contraseña e inicio de sesión único corporativo.',
        prompts: {
          disableSignUp: {
            label: 'Cerrar el registro',
            text: 'Esta aplicación es solo para empleados de la empresa. Los administradores crean todas las cuentas.\nDesactiva el autorregistro y quita el enlace de registro de la página de inicio de sesión.\nLos empleados existentes deben poder seguir iniciando sesión con sus cuentas y contraseñas.\nMantén el enlace de contraseña olvidada.',
          },
          companySso: {
            label: 'SSO corporativo',
            text: 'Permite que los empleados inicien sesión con la plataforma de identidad de la empresa mediante OIDC.\n\nMantén el inicio de sesión con cuenta y contraseña y añade un botón Cuenta corporativa.\nEl botón abre la plataforma de identidad de la empresa. Tras iniciar sesión correctamente, vuelve a la página de inicio de la aplicación.\n\nPermite que el primer inicio de sesión cree una cuenta en la aplicación, identificada por el identificador de usuario estable de la plataforma.\nNo vincules cuentas automáticamente por coincidencia de nombre o correo electrónico. Las cuentas nuevas usan los permisos predeterminados de la aplicación.\n\nEnumera la información que debe proporcionar el administrador de la plataforma de identidad y la URL de retorno que debe registrar.',
          },
          apiKeys: {
            label: 'Claves de API',
            text: 'Añade una entrada Claves de integración al menú de usuario, usando la capacidad de claves de API integrada en la aplicación.\nLos empleados gestionan solo las claves que han creado, indicando una finalidad y un periodo de validez en días.\nMuestra la clave completa una sola vez tras crearla, con un aviso para copiarla y guardarla de inmediato.\nMuestra en la lista el nombre de cada clave, un fragmento identificable, el estado, la caducidad y el último uso, y permite revocarla tras una confirmación.\nNo muestres nunca la clave completa en la lista, los registros ni los detalles.',
          },
        },
      },
      dataSources: {
        title: 'Fuentes de datos',
        description:
          'Elige la base de datos de la aplicación y usa datos de negocio de bases de datos externas existentes.',
        prompts: {
          postgres: {
            label: 'Cambiar de base de datos',
            text: 'Cambia la base de datos de la aplicación de SQLite a PostgreSQL.\nLee los datos de conexión de la configuración de ejecución del servidor, no del código fuente.\nExplica qué controlador de base de datos hay que instalar y qué ajustes hay que rellenar, y recuérdame que los datos existentes no se migran automáticamente.',
          },
          externalDatabase: {
            label: 'Base de datos externa',
            text: 'Conecta la base de datos financiera existente de la empresa como fuente de datos externa de solo lectura; no modifiques sus tablas.\nRelaciona los registros por número de proveedor y añade una sección Liquidación a los detalles del proveedor que muestre el ciclo de liquidación, el límite de crédito y el estado de liquidación, indicando su origen.\nSigue leyendo los datos de contacto del proveedor de la base de datos de la aplicación y lee los datos de liquidación directamente de la base de datos externa sin importarlos.\nLee las credenciales de conexión de la configuración de ejecución del servidor.',
          },
        },
      },
      authorization: {
        title: 'Permisos',
        description:
          'Controla quién puede abrir qué páginas, ejecutar qué acciones y ver qué registros.',
        prompts: {
          jobs: {
            label: 'Puestos',
            text: 'Crea los puestos Solicitante de compras y Revisor de pedidos para la aplicación.\nLos solicitantes de compras pueden entrar en la página de pedidos y ver los pedidos que han solicitado.\nLos revisores de pedidos pueden entrar en la página de pedidos, ver pedidos y aprobar o rechazar los pedidos pendientes.\nSolo los administradores de la aplicación pueden cambiar los permisos y las asignaciones.\nUsa la capacidad de autorización existente de la aplicación para que los administradores puedan ajustar los permisos y asignar personas más adelante.',
          },
          dataScopes: {
            label: 'Ámbitos de datos',
            text: 'Haz que los solicitantes de compras vean solo sus propios pedidos, usando el campo de solicitante del pedido para determinar a quién pertenece.\nLos revisores de pedidos pueden ver todos los pedidos y tramitar las aprobaciones pendientes.\nLos administradores pueden ajustar el ámbito de visualización de pedidos de cada puesto en su conjunto de permisos.',
          },
          restrictions: {
            label: 'Restricciones',
            text: 'Bob está ayudando temporalmente a revisar pedidos de compra y solo puede ver pedidos de 2.000 o menos.\nAñade un límite de importe a su acción Ver pedidos, manteniendo su puesto y sus ámbitos de datos actuales.\nAplica el límite a sus propios pedidos y a los pedidos compartidos con él.\nLos administradores pueden cambiar el importe o quitar la regla; antes de quitarla, explica que su ámbito visible puede ampliarse.',
          },
        },
      },
      workflow: {
        title: 'Flujos de trabajo',
        description:
          'Haz avanzar los registros de negocio por etapas, con esperas, tiempos de espera agotados, reintentos y un historial de quién hizo qué.',
        prompts: {
          stages: {
            label: 'Etapas',
            text: 'Añade un proceso a los pedidos de compra: Pendiente de aprobación → Pendiente de compra → Recibido → Completado.\nLos revisores aprueban o rechazan; un rechazo exige un motivo y devuelve el pedido al solicitante para que lo corrija y lo vuelva a enviar.\nCuando el comprador realiza la compra, el pedido queda pendiente de compra; confirmar la entrega con un albarán firmado lo pasa a Recibido, y la confirmación del solicitante lo completa.\nLos detalles del pedido ofrecen solo las acciones de la etapa actual, y las ediciones normales no pueden cambiar la etapa.\nComprueba las etapas y la información obligatoria en el servidor, y no sobrescribas nunca un resultado que otra persona ya haya enviado.',
          },
          backgroundExport: {
            label: 'Exportación en segundo plano',
            text: 'Añade una página de informe de pedidos que exporte los pedidos existentes a CSV.\nTras el envío, la exportación queda a la espera de procesarse, se genera en segundo plano y termina con un enlace de descarga.\nMuestra la etapa actual, el nombre del archivo, el número de pedidos exportados y los registros de envío y de procesamiento del sistema.\nReintenta según las reglas las generaciones fallidas y conserva el fallo definitivo para que lo gestione el responsable; volver a ejecutarla no debe crear archivos de informe duplicados.\nMantén visibles el progreso y el resultado tras actualizar la página, y permite exportar pedidos solo a las personas autorizadas.',
          },
          history: {
            label: 'Historial',
            text: 'Muestra la etapa actual y el historial de procesamiento en los detalles del pedido.\nCada entrada muestra quién actuó, cuándo, la acción, la etapa anterior y la posterior, y el motivo del rechazo o el albarán firmado, si los hay.\nMarca las acciones realizadas automáticamente como hechas por el sistema.\nConserva el progreso y el historial tras actualizar la página, para poder revisar todo el proceso una vez completado.',
          },
        },
      },
      scheduler: {
        title: 'Tareas programadas',
        description:
          'Ejecuta trabajo de negocio a horas fijas y consulta la próxima ejecución y sus resultados.',
        prompts: {
          reminder: {
            label: 'Recordatorio diario',
            text: 'Añade un recordatorio de pedidos pendientes a la aplicación de pedidos existente.\n\nA las 09:00, hora de Pekín, cada día laborable, busca los pedidos pendientes de aprobación, agrúpalos por revisor y envía a cada revisor una notificación en la aplicación.\nIncluye el número de pedidos pendientes y un enlace a la lista de pedidos pendientes. No envíes nada si no hay pedidos pendientes.\nLos administradores pueden ver la programación y los registros de ejecución, y pausar o reanudar los recordatorios.',
          },
          weeklyReport: {
            label: 'Informe semanal',
            text: 'A las 08:00, hora de Pekín, cada lunes, genera el resumen de ventas de la semana anterior y avisa al responsable de ventas.\nIncluye los ingresos por ventas, el número de pedidos y los totales por región. Los administradores pueden ver la tarea y los registros de ejecución.',
          },
        },
      },
      notification: {
        title: 'Notificaciones',
        description:
          'Envía mensajes en la aplicación, correos electrónicos o mensajes de bots de grupo cuando ocurre algo.',
        prompts: {
          inApp: {
            label: 'Mensaje en la aplicación',
            text: 'Añade la aprobación de pedidos a la aplicación actual y notifica los resultados a los solicitantes mediante mensajes en la aplicación.\n\nLos pedidos incluyen un número, un nombre, un solicitante, un importe y un estado de aprobación.\nLos solicitantes pueden ver sus propios pedidos. Los revisores pueden ver los pedidos pendientes y aprobarlos o rechazarlos. Reutiliza las funciones de pedidos y aprobación existentes, si las hay.\n\nTras la aprobación o el rechazo, envía un único mensaje en la aplicación solo al solicitante del pedido.\nEl título indica si el pedido se ha aprobado o rechazado. El cuerpo incluye el número del pedido, el nombre y el resultado de la aprobación.\nAl hacer clic en el mensaje se abren los detalles del pedido correspondiente.\nNo envíes nada mientras la aprobación esté pendiente. Notifica solo una vez el mismo resultado de aprobación.\nUn fallo en la notificación no afecta al resultado de aprobación guardado.',
          },
          email: {
            label: 'Correo electrónico',
            text: 'Añade el correo electrónico a las notificaciones de aprobación de pedidos existentes, usando el canal de correo electrónico configurado en la aplicación.\n\nCuando un pedido se apruebe o se rechace, envía el resultado al correo electrónico de la cuenta del solicitante.\nIncluye el número del pedido en el asunto y el nombre del pedido y el resultado en el cuerpo.\nMantén los mensajes en la aplicación existentes. Si el solicitante no tiene dirección de correo electrónico, envía solo el mensaje en la aplicación.\nUn fallo en el correo electrónico no debe afectar al resultado de la aprobación ni al mensaje en la aplicación.',
          },
        },
      },
      mail: {
        title: 'Correo',
        description:
          'Conecta buzones personales y lee, responde y envía correo de negocio.',
        prompts: {
          providers: {
            label: 'Proveedor de correo',
            text: 'Configura mailbox.org para la aplicación en mail.providers de la configuración del servidor:\n- Servidor de entrada IMAP: imap.mailbox.org, puerto 993, SSL/TLS.\n- Servidor de salida SMTP: smtp.mailbox.org, puerto 465, SSL/TLS.\nLos usuarios introducen su propia dirección de correo, nombre de usuario y contraseña en la página de cuentas de buzón y eligen la fecha desde la que se hará la primera sincronización; no escribas nunca las contraseñas de los buzones en la configuración ni en el código fuente.',
          },
          mailCenter: {
            label: 'Centro de correo',
            text: 'El correo está integrado en esta aplicación; reutilízalo en lugar de volver a crearlo o de instalar otro plugin.\nAñade a la navegación las páginas Centro de correo y Cuentas de buzón, usando el espacio de trabajo de correo y las páginas de cuentas de buzón que proporciona la capacidad de correo.\nLos usuarios pueden conectar sus propios buzones, sincronizar los mensajes entrantes, leer los mensajes y sus adjuntos y responder, conservando el asunto original y el contexto de la conversación y dirigiendo la respuesta al remitente original.\nCada usuario trabaja con sus propios buzones conectados.',
          },
          correspondence: {
            label: 'Correos de clientes',
            text: 'Añade una sección de correspondencia a los detalles del cliente, reutilizando los componentes de lectura y redacción de correo integrados en la aplicación.\nMuestra los mensajes cuyo remitente o destinatario coincida con las direcciones de correo de los contactos del cliente actual. Los comerciales pueden leer los mensajes, ver los adjuntos y responder usando sus propios buzones conectados.',
          },
        },
      },
      file: {
        title: 'Archivos',
        description:
          'Sube archivos, adjúntalos a registros y previsualízalos o descárgalos.',
        prompts: {
          attachments: {
            label: 'Adjuntos',
            text: 'Añade adjuntos de compra a mi aplicación de gestión de pedidos existente.\n\nAñade una zona de adjuntos a los detalles del pedido. Cada pedido puede tener varios archivos, incluidos PDF, imágenes y DOCX.\nMuestra los nombres y tamaños de archivo, con acciones para previsualizar, descargar y quitar adjuntos.\nTras subirlos, permite a los usuarios guardar los adjuntos en el pedido actual. Mantenlos disponibles cuando se vuelva a abrir el pedido.\nCualquier persona con acceso a un pedido puede ver y descargar sus adjuntos. Los solicitantes y los revisores pueden añadir o quitar adjuntos.\nQuitar un adjunto solo lo desvincula del pedido actual; conserva el archivo.',
          },
          avatar: {
            label: 'Avatar',
            text: 'Añade un avatar a cada empleado, con una imagen por empleado.\nPermite subir y sustituir el avatar, y muéstralo en las listas y los detalles de empleados.\nUsa el nuevo avatar tras sustituirlo y mantenlo visible después de actualizar la página.',
          },
        },
      },
      i18n: {
        title: 'Idiomas',
        description:
          'Cambia el idioma de la interfaz, añade idiomas y define el predeterminado.',
        prompts: {
          addLanguage: {
            label: 'Añadir un idioma',
            text: 'Añade el español a mi aplicación. Traduce la interfaz y los mensajes del servidor, y añade el español al menú de idiomas.',
          },
          defaultLanguage: {
            label: 'Idioma predeterminado',
            text: 'Haz que el chino simplificado sea el idioma predeterminado de la aplicación para quienes no hayan elegido ninguno. Mantén el inglés disponible en el menú de idiomas.',
          },
        },
      },
      theme: {
        title: 'Temas',
        description:
          'Ajusta los colores, las fuentes y la densidad, y cambia entre claro y oscuro.',
        prompts: {
          changeTheme: {
            label: 'Cambiar un tema',
            text: 'Actualiza el tema Compacto: usa el azul como color principal y aumenta ligeramente el radio de las esquinas. Mantén las fuentes, los tamaños de texto y el espaciado compacto actuales.',
          },
          newTheme: {
            label: 'Nuevo tema',
            text: 'Crea un tema Bosque con el verde como color principal, fondos suaves, esquinas moderadamente redondeadas y sombras sutiles.',
          },
        },
      },
    },
  },
  appearance: {
    title: 'Apariencia',
    mode: 'Modo de color',
    preset: 'Tema',
    light: 'Claro',
    dark: 'Oscuro',
    system: 'Sistema',
    themes: {
      default: 'Amplio',
      compact: 'Compacto',
    },
  },
  app: {
    title: 'NocoCRM',
  },
  actions: {
    close: 'Cerrar',
    save: 'Guardar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    language: 'Idioma',
  },
  notices: {
    serverLocaleFallback:
      'El servidor no admite este idioma, así que los mensajes del servidor aparecerán en inglés.',
    languageChangeFailed:
      'No se ha podido cambiar el idioma. Vuelve a intentarlo.',
  },
  account: {
    signOutFailed: 'No se ha podido cerrar la sesión. Vuelve a intentarlo.',
    openMenu: 'Abrir el menú de la cuenta',
    fallback: 'Cuenta',
    signOut: 'Cerrar sesión',
    signingOut: 'Cerrando sesión…',
  },
  navigation: {
    home: 'Inicio',
    open: 'Abrir la navegación',
    close: 'Cerrar la navegación',
    expand: 'Expandir la navegación',
    collapse: 'Contraer la navegación',
    toggle: 'Expandir o contraer la navegación',
    label: 'Navegación de la aplicación',
    description: 'Ve a una página de esta aplicación.',
    breadcrumb: 'Ruta de navegación',
    breadcrumbMore: 'Mostrar los niveles intermedios',
    back: 'Atrás',
  },
  dataTable: {
    noResults: 'No hay resultados.',
    sortAscending: 'Ascendente',
    sortDescending: 'Descendente',
    hideColumn: 'Ocultar',
    view: 'Vista',
    toggleColumns: 'Mostrar u ocultar columnas',
    selectedCount: '{{selected}} de {{total}} fila(s) seleccionada(s).',
    rowsPerPage: 'Filas por página',
    pageOf: 'Página {{page}} de {{pageCount}}',
    firstPage: 'Ir a la primera página',
    previousPage: 'Ir a la página anterior',
    nextPage: 'Ir a la página siguiente',
    lastPage: 'Ir a la última página',
  },
  datePicker: {
    placeholder: 'Elige una fecha',
    rangePlaceholder: 'Elige un intervalo de fechas',
  },
  'Lead follow-up': 'Seguimiento de leads',
  'Review everything a lead has now (the lead itself, its tasks, comments and related records in the CRM) and recommend the next step — keep following up, nurture, convert or invalid — with the reasons; when following up, say clearly how to follow up and what exactly to do. Use when a new lead comes in, when the user asks to follow up a lead or follow it up again, or asks "what should I do next with this lead".':
    'Revisa todo lo que tiene ahora un lead (el propio lead, sus tareas, comentarios y registros relacionados en el CRM) y recomienda el siguiente paso —seguir con el seguimiento, pasar a maduración, convertir o marcar como no válido— con los motivos; si se sigue con el seguimiento, indica claramente cómo hacerlo y qué hacer exactamente. Se usa cuando entra un lead nuevo, cuando el usuario pide hacer o retomar el seguimiento de un lead, o cuando pregunta «¿qué hago ahora con este lead?».',
  'Opportunity follow-up': 'Seguimiento de oportunidades',
  'Reviews everything about an opportunity as it now stands (the opportunity itself, the company, contacts and their roles, tasks, comments, approvals, the source lead) and judges whether its stage holds up and what to do next — advance to the next stage, keep at it in the current stage, pause, or mark it lost — with the reasons, risks and gaps to fill; when advancing, spells out exactly what to do. Use when a lead\'s conversion opens a new opportunity, when the outcome of an opportunity\'s task has been recorded, when the user asks for a follow-up, or when asked "what is the next step for this opportunity?".':
    'Revisa todo lo relativo a una oportunidad tal como está ahora (la propia oportunidad, la empresa, los contactos y sus roles, las tareas, los comentarios, las aprobaciones, el lead de origen) y valora si su etapa se sostiene y qué hacer a continuación —avanzar a la siguiente etapa, seguir trabajándola en la etapa actual, pausarla o marcarla como perdida— con los motivos, los riesgos y las carencias que cubrir; al avanzar, detalla exactamente qué hacer. Se usa cuando la conversión de un lead abre una oportunidad nueva, cuando se ha registrado el resultado de una tarea de la oportunidad, cuando el usuario pide un seguimiento o cuando se pregunta «¿cuál es el siguiente paso para esta oportunidad?».',
  'Approval review': 'Revisión de aprobaciones',
  'Helps an approver judge whether an approval request (discount, payment terms, contract terms, delivery commitment) is worth approving — how far the asked terms are from the standard, the effect on the amount and on collection, the opportunity\'s situation and the evidence supporting this concession, the other approvals submitted with it on the same opportunity, how earlier requests of the same kind were decided, the risks and what the applicant left unclear — then recommends approve, approve on conditions, reject or ask for more information, and drafts the decision comment. Use it after an approval is submitted, or when the approver asks "should this approval be approved?".':
    'Ayuda a un aprobador a valorar si conviene aprobar una solicitud de aprobación (descuento, condiciones de pago, cláusulas contractuales, compromiso de entrega) —cuánto se alejan las condiciones solicitadas del estándar, el efecto sobre el importe y el cobro, la situación de la oportunidad y las pruebas que respaldan esta concesión, las demás aprobaciones enviadas con ella en la misma oportunidad, cómo se resolvieron solicitudes anteriores del mismo tipo, los riesgos y lo que el solicitante dejó sin aclarar— y después recomienda aprobar, aprobar con condiciones, rechazar o pedir más información, y redacta el comentario de la decisión. Se usa después de enviar una aprobación o cuando el aprobador pregunta «¿se debe aprobar esta solicitud?».',
  'Task preparation': 'Preparación de tareas',
  "Prepares a salesperson for a task they are about to do with a customer (a call, a meeting, a visit, a demo) — what the task should achieve, where things stand from the record's tasks, comments and mail, who is on the other side and what part each plays, the questions to ask, what to bring, the risks, and the points to cover in order. Use it on the morning of a task, or when the task's owner asks to be prepared.":
    'Prepara a un comercial para una tarea que va a realizar con un cliente (una llamada, una reunión, una visita, una demostración) —qué debe lograr la tarea, en qué punto están las cosas según las tareas, los comentarios y el correo del registro, quién está al otro lado y qué papel desempeña cada uno, las preguntas que hacer, qué llevar, los riesgos y los puntos que tratar en orden—. Se usa la mañana de la tarea o cuando el responsable de la tarea pide que se le prepare.',
  flowDiagram: {
    configure: 'Configurar',
    overview: 'Vista general del diagrama',
    actualSize: 'Tamaño real',
    states: 'Estados',
    transitions: 'Transiciones',
    configurable: 'Parámetros',
    current: 'Actual',
    visited: 'Recorrido',
    initial: 'Inicial',
    final: 'Final',
    state: 'Estado',
    zoomOut: 'Alejar',
    zoomIn: 'Acercar',
    fit: 'Ajustar a la vista',
    empty: 'No hay estados que mostrar.',
    loading: 'Organizando el diagrama…',
    failed: 'No se puede organizar este diagrama.',
    nodeHelp: 'Pulsa Intro o Espacio para seleccionar un estado.',
    edgeHelp: 'Pulsa Intro o Espacio para seleccionar una transición.',
  },
  loginActivity: {
    heading: 'Del primer lead a la venta cerrada.',
    description:
      'Tu equipo de ventas de IA hace el seguimiento de cada lead y oportunidad, prepara cada reunión y cada aprobación, y tú decides.',
    phases: {
      lead: 'Lead',
      deal: 'Oportunidad',
      won: 'Cierre',
    },
    participants: {
      rep: 'Sophie Bennett',
      leadAgent: 'Seguimiento de leads con IA',
      prepAgent: 'Preparación de tareas con IA',
      dealAgent: 'Seguimiento de oportunidades con IA',
      approvalAgent: 'Revisión de aprobaciones con IA',
      manager: 'Daniel Brooks',
      customer: 'Emma Walsh',
    },
    capabilities: {
      capture: 'Captura con IA',
      followUp: 'Seguimiento con IA',
      pipeline: 'Pipeline',
      prep: 'Preparación de tareas',
      mail: 'Correo',
      approval: 'Aprobaciones',
    },
    timeline: 'Actividad',
    lead: {
      kind: 'Lead',
      title: 'Emma Walsh / Northwind Logistics',
      need: 'Planificación de flota, 200 camiones · desde un correo',
      grade: 'Categoría A',
    },
    deal: {
      kind: 'Oportunidad',
      title: 'Plataforma de planificación de flotas (Enterprise)',
      company: 'Northwind Logistics',
      amount: '48.000 $',
      owner: 'Sophie Bennett',
      won: 'Ganada',
    },
    leadStatuses: {
      new: 'Nuevo',
      working: 'En curso',
      converted: 'Convertido',
    },
    stages: {
      qualification: 'Cualificación',
      proposal: 'Propuesta',
      negotiation: 'Negociación',
      won: 'Ganada',
    },
    steps: {
      captured: {
        who: 'IA',
        what: 'creó el lead a partir de un correo',
      },
      leadFollowUp: {
        who: 'Seguimiento con IA',
        what: 'categoría A, llamar hoy a las 15:00',
      },
      converted: {
        who: 'Sophie Bennett',
        what: 'convirtió el lead en una oportunidad',
      },
      prepared: {
        who: 'IA',
        what: 'preparó la demo de mañana con sus propias rutas',
      },
      replied: {
        who: 'Emma Walsh',
        what: '¿podríamos pagar a 60 días desde la factura?',
      },
      dealFollowUp: {
        who: 'Seguimiento con IA',
        what: 'pasa a negociación; los 60 días requieren aprobación',
      },
      reviewed: {
        who: 'Revisión con IA',
        what: 'aprobar con condiciones',
      },
      approved: {
        who: 'Daniel Brooks',
        what: 'aprobó el plazo de pago a 60 días',
      },
      won: {
        who: 'Sophie Bennett',
        what: 'el contrato firmado ya está de vuelta',
      },
    },
  },
  // The template's Settings copy, translated in ./settings/.
  settings: settingsEsES,
  crm: crmEsES,
};

export default esES;
