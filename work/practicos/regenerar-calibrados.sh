#!/bin/bash
# Regenera todos los documentos con la calibración (página Letter + corrección medida de anverso y reverso).
# Cada uno sale en una carpeta «-calibrado». Uso: bash work/practicos/regenerar-calibrados.sh
cd "$(dirname "$0")/../.."
P=outputs/practicos-trapper; I=outputs/investigaciones-trapper
run() { echo "== $3"; node work/practicos/componer.mjs "$1" "$2" "$3" "${@:4}" --calibrado 2>&1 | grep -E "alineación|páginas en|✗|Faltan|fuera" ; }
run $P/fuentes/dibujo-snoopy.txt $P/Dibujo-Snoopy-calibrado Dibujo-Snoopy
run $I/fuentes/investigacion-circunferencia-normal.txt $I/Investigacion-Circunferencia-Normal-calibrada Investigacion-Circunferencia-Normal --perfil personal-normal-v1 --opt headingSize=21
run $P/fuentes/practico-biologia-natural.txt $P/Practico-Biologia-Natural-calibrado Practico-Biologia
run $P/fuentes/practico-biologia.txt $P/Practico-Biologia-2Y-calibrado Practico-Biologia --perfil personal-2y-v1
run $P/fuentes/practico-circunferencia-natural.txt $P/Practico-Circunferencia-Natural-calibrado Practico-Circunferencia
run $P/fuentes/practico-circunferencia-normal.txt $P/Practico-Circunferencia-Normal-calibrado Practico-Circunferencia --perfil personal-normal-v1
run $P/fuentes/practico-circunferencia-normal-en-blanco.txt $P/Practico-Circunferencia-Normal-para-completar-calibrado Practico-Circunferencia --perfil personal-normal-v1
run $P/fuentes/practico-quimica.txt $P/Practico-Quimica-2A-calibrado Practico-Quimica --perfil personal-2a-v1
run $P/fuentes/practico-quimica-soluciones.txt $P/Practico-Quimica-Soluciones-calibrado Practico-Quimica-Soluciones
run $P/fuentes/practico-fisica-energia.txt $P/Practico-Fisica-Energia-2Y-calibrado Practico-Fisica-Energia --perfil personal-2y-v1
run $P/fuentes/practico-fisica-6.txt $P/Practico-Fisica-6-2Y-calibrado Practico-Fisica-6 --perfil personal-2y-v1
run $P/fuentes/practico-5-2y.txt $P/Practico-5-Fisica-2Y-calibrado Practico-5 --perfil personal-2y-v1
run $P/fuentes/practico-5.txt $P/Practico-5-Fisica-Normal-calibrado Practico-5 --perfil personal-normal-v1
