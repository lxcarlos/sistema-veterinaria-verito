import readline from "readline";

// Definición de la estructura de una cita
interface Appointment {
    id: number;
    patientName: string;
    doctorName: string;
    date: Date;
    reason: string;
}

// Clase para manejar las citas
class AppointmentScheduler {
    private appointments: Appointment[] = [];
    private nextId: number = 1;

    // Crear una cita
    public createAppointment(patientName: string, doctorName: string, dateStr: string, reason: string): string {
        const date = new Date(dateStr);

        // Validación de fecha
        if (isNaN(date.getTime())) {
            return "Fecha inválida. Use formato YYYY-MM-DD HH:MM.";
        }
        if (date < new Date()) {
            return "No se pueden agendar citas en el pasado.";
        }

        const appointment: Appointment = {
            id: this.nextId++,
            patientName,
            doctorName,
            date,
            reason
        };

        this.appointments.push(appointment);
        return `Cita creada con ID ${appointment.id}`;
    }

    // Listar todas las citas
    public listAppointments(): string {
        if (this.appointments.length === 0) {
            return "📋 No hay citas registradas.";
        }
        return this.appointments
            .map(a => `ID: ${a.id} | Paciente: ${a.patientName} | Doctor: ${a.doctorName} | Fecha: ${a.date.toLocaleString()} | Motivo: ${a.reason}`)
            .join("\n");
    }

    // Cancelar cita por ID
    public cancelAppointment(id: number): string {
        const index = this.appointments.findIndex(a => a.id === id);
        if (index === -1) {
            return ` No se encontró cita con ID ${id}.`;
        }
        this.appointments.splice(index, 1);
        return `Cita con ID ${id} cancelada.`;
    }
}

// --- Programa interactivo ---
const scheduler = new AppointmentScheduler();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function menu() {
    console.log("\n=== Sistema de Agendación de Citas ===");
    console.log("1. Crear cita");
    console.log("2. Listar citas");
    console.log("3. Cancelar cita");
    console.log("4. Salir");
    rl.question("Seleccione una opción: ", (option) => {
        switch (option.trim()) {
            case "1":
                rl.question("Nombre del paciente: ", (patient) => {
                    rl.question("Nombre del doctor: ", (doctor) => {
                        rl.question("Fecha (YYYY-MM-DD HH:MM): ", (date) => {
                            rl.question("Motivo: ", (reason) => {
                                console.log(scheduler.createAppointment(patient, doctor, date, reason));
                                menu();
                            });
                        });
                    });
                });
                break;
            case "2":
                console.log(scheduler.listAppointments());
                menu();
                break;
            case "3":
                rl.question("ID de la cita a cancelar: ", (idStr) => {
                    const id = parseInt(idStr);
                    if (isNaN(id)) {
                        console.log("ID inválido.");
                    } else {
                        console.log(scheduler.cancelAppointment(id));
                    }
                    menu();
                });
                break;
            case "4":
                console.log("Saliendo...");
                rl.close();
                break;
            default:
                console.log("Opción inválida.");
                menu();
        }
    });
}

// Iniciar menú
menu();