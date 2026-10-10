#!/bin/sh
# Подключить git-хук, который следит за версией офлайн-кэша (sw.js)
cd "$(git rev-parse --show-toplevel)" || exit 1
chmod +x tools/pre-commit
ln -sf ../../tools/pre-commit .git/hooks/pre-commit
echo "Хук подключён: .git/hooks/pre-commit -> tools/pre-commit"
