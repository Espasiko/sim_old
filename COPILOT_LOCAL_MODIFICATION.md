# 🚀 Sim AI Copilot - Modificación para Proveedores Locales

## 📋 Resumen

Esta modificación permite usar **Copilot de Sim AI con tus propias API keys** y proveedores locales, eliminando la dependencia del servicio `SIM_AGENT_API_URL` de Sim.

## ✅ Proveedores Soportados

### 🆓 **Gratuitos/Locales**
- **Groq** - LLMs rápidos con API gratuita
- **Cerebras** - Inferencia rápida con tier gratuito  
- **Ollama** - Modelos completamente locales (Mistral, Llama, etc.)

### 💰 **Con API Key**
- **OpenAI** - GPT-4, GPT-3.5, etc.
- **Google** - Gemini Pro, Gemini Flash
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Haiku
- **Mistral** - Mistral Large, Mistral Medium
- **Cohere** - Command R, Command R+

## 🔧 Cambios Realizados

### 1. **Backend API** (`/apps/sim/app/api/copilot/chat/route.ts`)
- ✅ Añadido bypass para proveedores locales
- ✅ Función `shouldUseLocalProvider()` para detectar proveedores soportados
- ✅ Función `getProviderApiKey()` para obtener la API key correcta por proveedor
- ✅ Función `executeLocalCopilotRequest()` que usa el sistema de proveedores interno
- ✅ Soporte completo para streaming
- ✅ Manejo de errores y fallback al SIM_AGENT_API_URL original

### 2. **Variables de Entorno** (`/apps/sim/lib/env.ts`)
- ✅ Añadidas variables para todos los proveedores soportados:
  - `GROQ_API_KEY`
  - `CEREBRAS_API_KEY` 
  - `GOOGLE_API_KEY`
  - `COHERE_API_KEY`
  - `OLLAMA_URL`

### 3. **Configuración Local** (`/.simstudio/config.env`)
- ✅ Archivo de configuración completo con todas las opciones
- ✅ Comentarios explicativos para cada proveedor
- ✅ Configuración por defecto usando Groq
- ✅ Fallback al servicio original de Sim AI

## 🚀 Cómo Usar

### **Paso 1: Configurar Variables**
Edita `/home/spas/.simstudio/config.env` y descomenta la sección del proveedor que quieras usar:

```bash
# Para usar Groq (recomendado - gratis y rápido)
COPILOT_PROVIDER=groq
COPILOT_MODEL=llama-3.1-8b-instant
GROQ_API_KEY=tu_clave_groq

# Para usar Ollama (completamente local)
# COPILOT_PROVIDER=ollama
# COPILOT_MODEL=mistral
# OLLAMA_URL=http://host.docker.internal:11434
```

### **Paso 2: Ejecutar Sim AI**
```bash
cd /home/spas/sim_old
bun run dev:full
```

### **Paso 3: Probar Copilot**
- Abre `http://localhost:3000`
- Crea o abre un workflow
- Usa el chat de Copilot (esquina inferior derecha)
- ¡Debería funcionar con tu proveedor elegido!

## 🔄 Cambiar de Proveedor

Para cambiar de proveedor, simplemente:

1. **Edita** `/home/spas/.simstudio/config.env`
2. **Comenta** la configuración actual 
3. **Descomenta** la configuración del nuevo proveedor
4. **Reinicia** el servidor (`bun run dev:full`)

Ejemplo para cambiar a Cerebras:
```bash
# COPILOT_PROVIDER=groq              # ← Comentar Groq
# COPILOT_MODEL=llama-3.1-8b-instant
# GROQ_API_KEY=gsk_...

COPILOT_PROVIDER=cerebras            # ← Descomentar Cerebras  
COPILOT_MODEL=llama3.1-8b
CEREBRAS_API_KEY=csk-6rph8p3rxd929nxdhprrmfnt6cjktpjv46e5d2m356xe8y8r
```

## 🛠️ Funcionalidades Preservadas

✅ **Chat streaming** completo
✅ **Contexto de workflows** 
✅ **Historial de conversaciones**
✅ **Adjuntos de archivos**
✅ **Tool calling** (si el proveedor lo soporta)
✅ **Sistema RAG/Knowledge bases**
✅ **Manejo de errores**
✅ **Fallback automático** al servicio original

## 🔒 Seguridad

- ⚠️ **Regenera las API keys** compartidas en el chat después de la prueba
- 🔐 Las claves se almacenan en variables de entorno locales
- 🚫 No se envían datos al servicio original cuando usas proveedores locales

## 🐛 Resolución de Problemas

### **Copilot no responde**
1. Verifica que `COPILOT_PROVIDER` esté configurado
2. Confirma que la API key sea válida
3. Revisa los logs: `docker logs simstudio-app`

### **Error de API key**
- Cada proveedor requiere su propia API key
- Ollama no necesita API key, solo `OLLAMA_URL`

### **Fallback al servicio original**
- Si tu proveedor local falla, automáticamente usa `SIM_AGENT_API_URL`
- Esto consume tu crédito de $10 de Sim AI

## 📊 Comparación de Proveedores

| Proveedor | Coste | Velocidad | Calidad | Recomendación |
|-----------|-------|-----------|---------|---------------|
| **Groq** | 🆓 Gratis | ⚡ Muy rápida | ⭐⭐⭐⭐ | ✅ **Recomendado** |
| **Cerebras** | 🆓 Gratis | ⚡ Muy rápida | ⭐⭐⭐⭐ | ✅ **Alternativa** |
| **Ollama** | 🆓 Local | 🐌 Lenta | ⭐⭐⭐ | ✅ **Para privacidad** |
| **OpenAI** | 💰 Pago | ⚡ Rápida | ⭐⭐⭐⭐⭐ | 💡 **Si tienes crédito** |
| **Claude** | 💰 Pago | ⚡ Rápida | ⭐⭐⭐⭐⭐ | 💡 **Para tareas complejas** |

## 🎯 Próximos Pasos

- [ ] Implementar selección de proveedor desde la UI
- [ ] Añadir métricas de uso por proveedor  
- [ ] Integrar más proveedores (DeepSeek, xAI, etc.)
- [ ] Mejorar manejo de herramientas por proveedor

---

**¡Disfruta de Sim AI Copilot con tus propios proveedores! 🎉**
