# Guía de Pruebas Offline - Inspección Rápida

## Cómo Verificar que Funciona OFFLINE

### Método 1: DevTools Network Throttling (Recomendado)

#### En Chrome/Edge:
```
1. Abre: http://localhost:3000/inspeccion-rapida
2. Presiona: F12 (DevTools)
3. Vay a: Network tab
4. Busca: "Offline" dropdown (arriba a la izquierda)
5. Selecciona: "Offline"
6. La página debería recargar y funcionar normalmente
```

#### Qué probar:
- [ ] Escribir lugar, inspector, responsable
- [ ] Hacer clic en "Siguiente"
- [ ] Ver pantalla 2 (Captura de fotos)
- [ ] Capturar foto con cámara
- [ ] Ver foto en galería
- [ ] Cambiar tipo de foto (Hallazgo/Evidencia)
- [ ] Generar PDF
- [ ] Generar ZIP
- [ ] Verificar que PDF/ZIP se descargan

**Todo debe funcionar sin errores de conexión.**

---

### Método 2: Desactivar Internet Completamente

#### En Windows/Mac:
```
1. Desconecta tu WiFi o cable Ethernet
2. Abre http://localhost:3000/inspeccion-rapida
3. Completa inspección normalmente
4. Descarga PDF/ZIP
```

**Resultado esperado**: Todo funciona sin conexión a internet.

---

### Método 3: Simular Pérdida de Conexión

#### En Chrome DevTools:
```
1. Abre la página en modo Online normal
2. Comienza una inspección
3. Abre DevTools → Network
4. Selecciona "Offline"
5. Intenta continuar capturando fotos
6. Intenta generar PDF

Resultado: Todo sigue funcionando
```

---

## Verificaciones Técnicas en Console

### 1. Verificar que no hay llamadas fetch
```javascript
// En DevTools Console:
navigator.fetch.toString()
// Debería mostrar código nativo, no interceptado

// Si ves algo como "fetch bloqueada", revisa la inspección rápida
```

### 2. Verificar que IndexedDB funciona
```javascript
// En DevTools Console:
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open("inspecciones");
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

db.objectStoreNames
// Debería mostrar: ["metadata", "fotos"]
```

### 3. Verificar almacenamiento
```javascript
// Ver datos guardados
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open("inspecciones");
  request.onsuccess = () => resolve(request.result);
});

const tx = db.transaction("metadata", "readonly");
const store = tx.objectStore("metadata");
const data = await new Promise((resolve, reject) => {
  const req = store.get("inspeccionData");
  req.onsuccess = () => resolve(req.result);
});

console.log(data)
// Debería mostrar: { key: "inspeccionData", value: { lugar, inspector, ... } }
```

---

## Checklist de Validación

### Pantalla 1: Información
- [ ] Cargar página sin internet
- [ ] Escribir lugar
- [ ] Escribir inspector
- [ ] Escribir responsable
- [ ] Hacer clic "Siguiente"
- [ ] Datos se guardan en IndexedDB

### Pantalla 2: Captura de Fotos
- [ ] Hacer clic "Tomar Foto"
- [ ] Seleccionar foto de galería (si no tienes cámara)
- [ ] Foto se muestra en la galería
- [ ] Cambiar tipo: Hallazgo → Evidencia
- [ ] Agregar descripción
- [ ] Ver contador de fotos
- [ ] Generar PDF sin errores
- [ ] Generar ZIP sin errores
- [ ] Verificar descarga de archivos

### Reportes
- [ ] PDF abre correctamente
- [ ] ZIP contiene carpetas Hallazgos y Evidencias
- [ ] PDF muestra hallazgos agrupados
- [ ] PDF muestra evidencias
- [ ] ZIP tiene metadata.json
- [ ] ZIP tiene fotos con extensiones correctas

---

## Troubleshooting

### Problema: "Failed to fetch"
**Causa**: IndexedDB no está guardando
**Solución**: 
```javascript
// Verificar permisos de IndexedDB
try {
  await indexedDB.databases()
  console.log("IndexedDB habilitado")
} catch (e) {
  console.error("IndexedDB no disponible", e)
}
```

### Problema: PDF no se genera en offline
**Causa**: jsPDF no está disponible
**Solución**: Verificar que `import jsPDF from "jspdf"` funciona en modo offline
```javascript
// En console:
import("jspdf").then(m => console.log("jsPDF disponible:", m))
```

### Problema: Fotos no se guardan
**Causa**: IndexedDB lleno o permiso denegado
**Solución**:
```javascript
// Limpiar IndexedDB
const req = indexedDB.deleteDatabase("inspecciones")
req.onsuccess = () => console.log("Base de datos limpiada")
```

---

## Prueba Automatizada (Cypress)

```javascript
// cypress/e2e/offline-inspection.cy.js
describe("Inspección Rápida - Offline", () => {
  it("debería funcionar sin internet", () => {
    // Simular offline
    cy.exec('npx cypress run --offline')
    
    // Navegar
    cy.visit("/inspeccion-rapida")
    
    // Pantalla 1
    cy.get('input[placeholder*="Lugar"]').type("Almacén Principal")
    cy.get('input[placeholder*="Inspector"]').type("Juan")
    cy.get('button').contains("Siguiente").click()
    
    // Pantalla 2
    cy.get('button').contains("Tomar Foto").should("exist")
    
    // Generar PDF
    cy.get('button').contains("PDF").click()
    cy.get('button').contains("Generar").click()
    
    // Verificar descarga
    cy.readFile("cypress/downloads/*.pdf").should("exist")
  })
})
```

---

## Monitoreo en Producción

### Script de verificación offline
```javascript
// Agregar en /app/inspeccion-rapida/page.tsx
useEffect(() => {
  const handleOffline = () => {
    console.log("[v0] ✓ OFFLINE - Inspección rápida sigue funcionando")
  }
  
  const handleOnline = () => {
    console.log("[v0] ✓ ONLINE - Conexión restaurada")
  }
  
  window.addEventListener("offline", handleOffline)
  window.addEventListener("online", handleOnline)
  
  return () => {
    window.removeEventListener("offline", handleOffline)
    window.removeEventListener("online", handleOnline)
  }
}, [])
```

---

## Performance en Offline

### Benchmark esperado
- Captura de foto: < 500ms
- Guardar en IndexedDB: < 100ms
- Generar PDF: < 2s
- Generar ZIP: < 3s
- Descargar archivo: < 500ms

**Total offline**: ~6 segundos para completar inspección + descargar reportes

---

## Conclusión

**Pasos simples para verificar:**

1. Abre DevTools → Network → Offline
2. Completa inspección normal
3. Genera PDF/ZIP
4. Verifica descarga

**Si todo funciona = ✓ OFFLINE funcional**

**Documentación relacionada:**
- `/docs/OFFLINE_CAPABILITY.md` - Capacidades detalladas
- `/docs/OFFLINE_SUMMARY.md` - Resumen ejecutivo
