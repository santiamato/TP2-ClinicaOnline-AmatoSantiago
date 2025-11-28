# Clinica Online - Santa Ana

Aplicacion web construida con Angular para gestionar la clinica Santa Ana. Permite a pacientes, especialistas y administradores manejar turnos, historias clinicas y infrmes

## Sobre la clinica

La Clinica Santa Ana cuenta con seis consultorios, dos laboratorios y un sector administrativo que atiende de lunes a viernes de 8 a 19 hs y sabados hasta las 14 hs. El sitio replica este funcionamiento: centraliza la solicitud de turnos, el registro de especialistas/pacientes y la visualizacion de historias clinicas. Cada turno dura al menos 30 minutos y puede involucrar profesionales con multiples especialidades, por lo que la plataforma ofrece filtros por profesional o especialidad

## Roles y formas de acceso

## Rol: Paciente
## Accesos permitidos:

Mi perfil (/mi-perfil)
Mis turnos (/mis-turnos)
Solicitar turno (/solicitar-turno)


## Rol: Especialista
## Accesos permitidos:

Su perfil, incluyendo la gestión de disponibilidad
Mis turnos (panel exclusivo de especialista)
Sección Pacientes (/pacientes)


## Rol: Administrador
## Accesos permitidos:

Todo lo que puede ver un Paciente y un Especialista
Sección de Usuarios (/usuarios)
Turnos globales (/turnos)
Informes (/informes)
Solicitar turno para terceros

## Pantallas y secciones

### Inicio
Pagina publica con hero de bienvenida, descripcion general de la clinica y tarjetas que resaltan la atencion humana, los turnos online y los profesionales disponibles.

### Registro 
Permite crear cuentas de:
- **Pacientes**: formulario con datos personales, obra social, dos imagenes obligatorias y control reCAPTCHA.
- **Especialistas**: seleccion y alta de especialidades (con opcion de agregar nuevas), carga de foto y aviso de aprobacion pendiente por un administrador.

### Login 
Formulario reactivo con validaciones y mensajes claros, mas accesos rapidos precargados para usuarios demo (pacientes, especialistas y administrador).

### Mi perfil 
- **Pacientes**: visualizan datos personales en tarjetas animadas, galeria de imagenes y su historia clinica completa.
- **Especialistas**: administran disponibilidad por especialidad mediante una matriz dia/horario y consultan su informacion basica.
- **Administradores**: revisan datos personales basicos.

### Mis turnos 
Listado filtrable con animaciones:
- **Pacientes**: cancelar turnos, completar encuestas y calificar la atencion recibida.
- **Especialistas**: aceptar o rechazar turnos, registrar resenas y cargar historia clinica (altura, peso, temperatura, presion y hasta tres datos extra), lo que genera registros en Historias Clinicas.

### Solicitar turno 
Flujo paso a paso:
1. Elegir profesional (con foto).
2. Seleccionar especialidad.
3. Elegir dia disponible (segun disponibilidad cargada o horarios base).
4. Seleccionar horario libre.
5. Confirmar el turno.  
Los administradores pueden escoger cualquier paciente desde un desplegable inicial para agendar en su nombre.

### Seccion Pacientes 
Panel donde cada especialista ve la lista de pacientes atendidos y accede a sus historias clinicas con detalles de signos vitales y notas extra.

### Seccion Usuarios 
Herramienta integral de gestion:
- Buscador por nombre, mail o rol y descarga de Excel (`usuarios.xlsx`) con toda la nomina.
- Toggle para aprobar especialistas.
- Formularios para crear pacientes, especialistas y administradores (subida de imagenes, alta en Supabase Auth, sincronizacion de especialidades).
- Consulta de historia clinica por paciente dentro de la misma pantalla.

### Turnos 
Vista consolidada de todos los turnos de la clinica. Permite filtrarlos por especialidad o especialista y cancelarlos ingresando un motivo administrativo.

### Informes 
Dashboard analitico:
- Graficos con Chart.js (turnos por especialidad y por dia).
- Comparativas de turnos solicitados/finalizados por medico dentro de un rango de fechas configurable.
- Tabla con el log de ingresos (usuario, rol, fecha y hora).
- Exportacion completa del dashboard a PDF mediante html2canvas + jsPDF.

## Navegacion 

1. **Registro e ingreso:** los usuarios nuevos se registran segun su rol y validan el correo; los especialistas quedan pendientes de aprobacion administrativa.
2. **Gestion diaria:**
   - Pacientes reservan turnos desde solicitar turno, los siguen en mis turnos y revisan su historial en mi perfil.
   - Especialistas configuran disponibilidad en mi perfil, atienden y registran historias desde mis turnos o consultan pacientes anteriores en pacientes.
   - Administradores controlan usuarios, turnos y reportes desde las secciones exclusivas (usuarios, turnos, informes).
<img width="1882" height="912" alt="image" src="https://github.com/user-attachments/assets/5ae17913-9d19-4f20-844d-c2d54892c882" />
<img width="1893" height="915" alt="image" src="https://github.com/user-attachments/assets/c6f6a29e-05cd-4807-92ca-552e0289b1ec" />
<img width="1444" height="914" alt="image" src="https://github.com/user-attachments/assets/0e8fbe51-82c7-4a9f-afe8-b4b563e1b44c" />
<img width="1428" height="915" alt="image" src="https://github.com/user-attachments/assets/05c77aba-b1af-40fb-bfac-7ded78c8f041" />
<img width="1319" height="914" alt="image" src="https://github.com/user-attachments/assets/8f2de3e9-e686-4a23-9569-41c31c79ff69" />
<img width="1204" height="913" alt="image" src="https://github.com/user-attachments/assets/e92bb6b3-0f3e-455f-a568-aa551946c083" />
<img width="1336" height="914" alt="image" src="https://github.com/user-attachments/assets/cc44b48f-9c54-4a40-b3f2-d82d7704c08d" />







