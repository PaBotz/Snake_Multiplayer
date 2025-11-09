const ws = require("ws");

const server = new ws.WebSocketServer({port: 8080}, () => {
    console.log("Servidor creado...");
});

// Datos del juego
var jugadores = new Map();  // Se guarda: conexion -> datos del jugador
var frutas = new Map();      // Se guarda: id -> datos de la fruta
var siguienteId = 0;
var siguienteIdFruta = 0;
var CantidadDeFrutas=3;

// Función para crear una nueva fruta
function crearFruta() {
    var nuevaFruta = {
        id: siguienteIdFruta,
        posx: Math.floor(Math.random() * 24) * 20, // Posiciones en grid de 20px
        posy: Math.floor(Math.random() * 24) * 20
    };
    siguienteIdFruta++;
    frutas.set(nuevaFruta.id, nuevaFruta);
    return nuevaFruta;
}

// Crear algunas frutas iniciales
for(let i = 0; i < CantidadDeFrutas; i++) {
    crearFruta();
}

server.addListener("connection", (conexionJugador) => {
    console.log("Alguien se ha conectado");

    // Crear nuevo jugador
    datosIniciales = {
        id: siguienteId,
        posx: Math.floor(Math.random() * 24) * 20, // Posiciones en grid
        posy: Math.floor(Math.random() * 24) * 20,
        dir: "quieto",
        puntos: 0
    };

    siguienteId++;
    jugadores.set(conexionJugador, datosIniciales);

    // Avisar a todos que alguien se ha conectado
    jugadores.forEach((d, c) => {
        c.send(JSON.stringify({
            tipo: "new",
            datos: datosIniciales
        }));
    });

    // Avisar de las antiguas conexiones
    jugadores.forEach((d, c) => {
        if(c != conexionJugador) {
            conexionJugador.send(JSON.stringify({
                tipo: "new",
                datos: d
            }));
        }
    });

    // Enviar todas las frutas existentes al nuevo jugador
    frutas.forEach((fruta) => {
        conexionJugador.send(JSON.stringify({
            tipo: "nuevaFruta",
            datos: fruta
        }));
    });

    // Manejo de desconexión
    conexionJugador.addEventListener("close", () => {
        console.log("Alguien se ha desconectado");
        
        var datosDeQuienSeDesconecta = jugadores.get(conexionJugador);
        jugadores.delete(conexionJugador);

        // Avisar a todos que alguien se desconectó
        jugadores.forEach((d, c) => {
            c.send(JSON.stringify({
                tipo: "delete",
                datos: datosDeQuienSeDesconecta.id
            }));
        });
    });

    // Manejo de mensajes
    conexionJugador.addEventListener("message", (m) => {
        mensaje = JSON.parse(m.data.toString());
        
        if(mensaje.tipo == "mover") {
            var datosDelJugador = jugadores.get(conexionJugador);
            
            // Actualizar posición y dirección
            datosDelJugador.posx = mensaje.datos.posx;
            datosDelJugador.posy = mensaje.datos.posy;
            datosDelJugador.dir = mensaje.datos.dir;
            
            jugadores.set(conexionJugador, datosDelJugador);

            // Informar a todos los jugadores del movimiento
            jugadores.forEach((d, c) => {
                c.send(JSON.stringify({
                    tipo: "mover",
                    datos: datosDelJugador
                }));
            });
            
        } else if(mensaje.tipo == "comerFruta") {
            // El jugador comió una fruta
            var idFruta = mensaje.datos.idFruta;
            var datosDelJugador = jugadores.get(conexionJugador);
            
            // Verificar que la fruta existe
            if(frutas.has(idFruta)) {
                // Aumentar puntos del jugador
                datosDelJugador.puntos++;
                jugadores.set(conexionJugador, datosDelJugador);
                
                // Eliminar la fruta
                frutas.delete(idFruta);
                
                // Avisar a todos que la fruta fue comida
                jugadores.forEach((d, c) => {
                    c.send(JSON.stringify({
                        tipo: "frutaComida",
                        datos: {
                            idFruta: idFruta,
                            idJugador: datosDelJugador.id,
                            puntosJugador: datosDelJugador.puntos
                        }
                    }));
                });
                
                // Crear una nueva fruta
                var nuevaFruta = crearFruta();
                
                // Avisar a todos sobre la nueva fruta
                jugadores.forEach((d, c) => {
                    c.send(JSON.stringify({
                        tipo: "nuevaFruta",
                        datos: nuevaFruta
                    }));
                });
            }
        }
    });
});