#!/bin/bash

echo "🔍 Verificando configuración de Supabase..."
echo ""

# Verificar que .env existe y tiene las variables
if [ -f ".env" ]; then
  echo "✅ Archivo .env encontrado"
  
  if grep -q "SUPABASE_URL" .env; then
    echo "✅ SUPABASE_URL configurado"
  else
    echo "❌ SUPABASE_URL falta"
  fi
  
  if grep -q "SUPABASE_KEY" .env; then
    echo "✅ SUPABASE_KEY configurado"
  else
    echo "❌ SUPABASE_KEY falta"
  fi
  
  if grep -q "SUPABASE_SERVICE_KEY" .env; then
    echo "✅ SUPABASE_SERVICE_KEY configurado"
  else
    echo "❌ SUPABASE_SERVICE_KEY falta"
  fi
  
  if grep -q "JWT_SECRET" .env; then
    echo "✅ JWT_SECRET configurado"
  else
    echo "❌ JWT_SECRET falta"
  fi
  
else
  echo "❌ Archivo .env no encontrado"
  echo "   Ejecuta: cp .env.example .env"
fi

echo ""
echo "✨ Usa 'npm run dev' para iniciar el servidor"
