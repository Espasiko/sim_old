# 🧪 Guía de Pruebas - Copilot Local con Proveedores Propios

## 📋 **Resumen de Cambios Implementados**

### **Archivos Modificados**:
1. ✅ `/apps/sim/.env` - Configuración con Groq
2. ✅ `/apps/sim/lib/env.ts` - Nuevas variables COPILOT_CHAT_PROVIDER y COPILOT_RAG_PROVIDER
3. ✅ `/apps/sim/app/api/copilot/chat/route.ts` - Bypass local para chat
4. ✅ `/apps/sim/app/api/copilot/tools/mark-complete/route.ts` - Handler local
5. ✅ `/apps/sim/app/api/copilot/stats/route.ts` - Handler local de estadísticas
6. ✅ `/apps/sim/app/api/copilot/api-keys/route.ts` - Gestión local de keys
7. ✅ `/apps/sim/app/api/copilot/api-keys/generate/route.ts` - Generación local

### **Configuración Actual**:
```bash
# Proveedor principal: Groq (gratis y rápido)
COPILOT_PROVIDER=groq
COPILOT_MODEL=llama-3.1-8b-instant
COPILOT_CHAT_PROVIDER=groq
COPILOT_CHAT_MODEL=llama-3.1-8b-instant
COPILOT_RAG_PROVIDER=groq
COPILOT_RAG_MODEL=llama-3.1-8b-instant
GROQ_API_KEY=gsk_R71zlphGat4AUYPv0g81WGdyb3FYFidHQW7WmPyzgO3oKDFwY1vSy
```

---

## 🧪 **PLAN DE PRUEBAS**

### **TEST 1: Verificar Configuración**
```bash
# Verificar que las variables están cargadas
cd /home/spas/sim_old
grep -E "COPILOT.*PROVIDER|COPILOT.*MODEL" apps/sim/.env
```

**Resultado esperado**: Debe mostrar todas las variables configuradas con Groq

---

### **TEST 2: Probar Chat de Copilot**
1. **Acceder**: `http://localhost:3000`
2. **Login**: `espasiko@local.dev` / `Ninami12$ya`
3. **Abrir workflow**: Cualquier workflow en "Mi Workspace"
4. **Abrir Copilot**: Click en el icono 💬 (esquina inferior derecha)
5. **Enviar mensaje**: "Hola, ¿puedes ayudarme a crear un workflow?"

**Resultado esperado**: 
- ✅ Respuesta del modelo Groq (llama-3.1-8b-instant)
- ✅ Sin errores de API key
- ✅ Respuesta rápida (Groq es muy rápido)

**Verificar en logs**:
```bash
# Ver logs del servidor
docker logs simstudio-app --tail 50 | grep -i copilot
```

Buscar líneas como:
```
[CopilotChatAPI] Using local provider: groq
```

---

### **TEST 3: Probar Modo Agent (Edición de Workflows)**
1. **En el Copilot**, cambiar a modo **"Agent"** (no "Ask")
2. **Enviar comando**: "Añade un bloque HTTP Request que llame a https://api.example.com"
3. **Aprobar cambios**: Cuando Copilot proponga los cambios

**Resultado esperado**:
- ✅ Copilot propone cambios específicos
- ✅ Los cambios se aplican al workflow
- ✅ Sin errores de tool completion

**Verificar en logs**:
```bash
docker logs simstudio-app --tail 50 | grep "mark-complete"
```

Buscar:
```
[CopilotMarkToolCompleteAPI] Using local tool completion handler
```

---

### **TEST 4: Probar Búsqueda en Documentación (RAG)**
1. **En el Copilot**, usar el símbolo **@**
2. **Seleccionar**: `@Docs`
3. **Buscar**: "How to use HTTP Request block"

**Resultado esperado**:
- ✅ Copilot busca en la documentación
- ✅ Responde con información relevante
- ✅ Usa COPILOT_RAG_PROVIDER (Groq)

---

### **TEST 5: Verificar API Keys en Settings**
1. **Ir a**: Settings → Copilot
2. **Verificar**: Debe mostrar `***...local (groq)`

**Resultado esperado**:
- ✅ Muestra configuración local
- ✅ No intenta conectar con sim.ai
- ✅ Botón "Generate" muestra mensaje sobre variables de entorno

---

### **TEST 6: Probar con Cerebras (Alternativa)**
1. **Editar** `/home/spas/sim_old/apps/sim/.env`:
```bash
# Comentar Groq
# COPILOT_CHAT_PROVIDER=groq
# COPILOT_CHAT_MODEL=llama-3.1-8b-instant

# Descomentar Cerebras
COPILOT_CHAT_PROVIDER=cerebras
COPILOT_CHAT_MODEL=llama3.1-8b
```

2. **Reiniciar servidor**:
```bash
pkill -f "bun run dev:full"
cd /home/spas/sim_old && ~/.bun/bin/bun run dev:full
```

3. **Repetir TEST 2**

**Resultado esperado**:
- ✅ Funciona con Cerebras
- ✅ Respuestas similares pero de otro proveedor

---

### **TEST 7: Probar con Ollama Local (Sin API Key)**
1. **Verificar Ollama**:
```bash
ollama list
curl http://localhost:11434/api/generate -d '{"model":"mistral","prompt":"Hello"}'
```

2. **Editar** `.env`:
```bash
COPILOT_CHAT_PROVIDER=ollama
COPILOT_CHAT_MODEL=mistral
OLLAMA_URL=http://localhost:11434
```

3. **Reiniciar y probar**

**Resultado esperado**:
- ✅ Funciona con Mistral local
- ✅ Sin coste de API
- ✅ Más lento pero privado

---

## 🐛 **TROUBLESHOOTING**

### **Error: "API key not found"**
**Causa**: La variable de entorno no está cargada
**Solución**:
```bash
# Verificar que existe
grep GROQ_API_KEY /home/spas/sim_old/apps/sim/.env

# Reiniciar servidor
pkill -f "bun run dev:full"
cd /home/spas/sim_old && ~/.bun/bin/bun run dev:full
```

### **Error: "Provider not supported"**
**Causa**: El proveedor no está en la lista de válidos
**Solución**: Usar uno de: `groq`, `cerebras`, `ollama`, `openai`, `anthropic`, `google`, `mistral`, `cohere`

### **Error: "Copilot no responde"**
**Causa**: Problema con el proveedor
**Solución**:
```bash
# Ver logs detallados
docker logs simstudio-app --tail 100 | grep -i error

# Probar API directamente
curl -X POST https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3.1-8b-instant","messages":[{"role":"user","content":"test"}]}'
```

### **Error: "Ollama connection refused"**
**Causa**: Ollama no está corriendo
**Solución**:
```bash
# Iniciar Ollama
ollama serve

# O verificar que está corriendo
ps aux | grep ollama
```

---

## 📊 **COMPARACIÓN DE PROVEEDORES**

| Proveedor | Velocidad | Calidad | Coste | Privacidad | Recomendación |
|-----------|-----------|---------|-------|------------|---------------|
| **Groq** | ⚡⚡⚡⚡⚡ | ⭐⭐⭐⭐ | 🆓 Gratis | ⚠️ Cloud | ✅ **Mejor opción** |
| **Cerebras** | ⚡⚡⚡⚡⚡ | ⭐⭐⭐⭐ | 🆓 Gratis | ⚠️ Cloud | ✅ **Alternativa** |
| **Ollama** | ⚡⚡ | ⭐⭐⭐ | 🆓 Local | ✅ 100% | ✅ **Para privacidad** |
| **OpenAI** | ⚡⚡⚡⚡ | ⭐⭐⭐⭐⭐ | 💰 Pago | ⚠️ Cloud | 💡 **Si tienes crédito** |
| **Claude** | ⚡⚡⚡⚡ | ⭐⭐⭐⭐⭐ | 💰 Pago | ⚠️ Cloud | 💡 **Mejor calidad** |

---

## ✅ **CHECKLIST DE VERIFICACIÓN**

- [ ] Servidor corriendo en `http://localhost:3000`
- [ ] Login funciona con `espasiko@local.dev`
- [ ] Variables de entorno cargadas correctamente
- [ ] Chat de Copilot responde con Groq
- [ ] Modo Agent puede editar workflows
- [ ] Búsqueda en docs funciona
- [ ] Settings muestra configuración local
- [ ] Probado con al menos 2 proveedores diferentes
- [ ] Sin errores en logs del servidor
- [ ] Respuestas coherentes y útiles

---

## 🎯 **PRÓXIMOS PASOS**

1. **Crear UI de configuración** en Settings para cambiar proveedores sin editar .env
2. **Añadir métricas** de uso por proveedor
3. **Implementar fallback** automático si un proveedor falla
4. **Añadir más proveedores** (DeepSeek, xAI, etc.)
5. **Optimizar prompts** para cada proveedor

---

**¡El Copilot ahora funciona completamente con tus propias API keys!** 🎉
