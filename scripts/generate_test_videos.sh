#!/usr/bin/env bash
set -euo pipefail

OUTDIR="tests/fixtures/videos"
mkdir -p "$OUTDIR"

gen_audio() {
  local text="$1" out="$2"
  echo "$text" | say -v Milena -o "$out.tmp.aiff"
  ffmpeg -y -i "$out.tmp.aiff" -ar 16000 -ac 1 "$out" 2>/dev/null
  rm -f "$out.tmp.aiff"
}

make_video() {
  local audio="$1" video="$2" extra="$3"
  local bg="/tmp/rutube_test_bg.jpg"
  # create background image
  ffmpeg -y -f lavfi -i "color=c=#2d2d2d:s=1280x720:d=1" -vframes 1 "$bg" 2>/dev/null
  if [ -n "$extra" ]; then
    ffmpeg -y -loop 1 -i "$bg" -i "$audio" \
      -filter_complex "$extra" \
      -c:v libx264 -preset ultrafast -tune stillimage \
      -c:a aac -shortest -movflags +faststart "$video" 2>/dev/null
  else
    ffmpeg -y -loop 1 -i "$bg" -i "$audio" \
      -c:v libx264 -preset ultrafast -tune stillimage \
      -c:a aac -shortest -movflags +faststart "$video" 2>/dev/null
  fi
  rm -f "$bg"
  local dur
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$video" 2>/dev/null)
  echo "  -> $video (${dur}s)"
}

echo "=== 1/5: car_repair_guide (how_to, 60s) ==="
gen_audio "\
Сегодня я покажу, как заменить генератор на ВАЗ-2110 своими руками.
Это довольно простая операция, с которой справится любой начинающий автолюбитель.
Первым делом отключаем минусовую клемму аккумулятора. Для этого понадобится рожковый ключ на 10.
Затем берём головку на 13 с трещоткой и откручиваем верхнюю гайку крепления генератора.
Не забудьте поддержать генератор снизу, чтобы он не упал.
Нижний болт крепления удобно откручивать удлинителем для трещотки.
После того как все крепления сняты, аккуратно извлекаем старый генератор.
Перед установкой нового обязательно проверьте совместимость по каталогу.
Новый генератор закрепляется в обратной последовательности.
Момент затяжки всех гаек — 30 Ньютон-метров. Используйте динамометрический ключ.
После установки подключите клемму и проверьте зарядку мультиметром.
Напряжение на клеммах должно быть 13.5-14.5 вольт.
Если всё в порядке — генератор заменён успешно." \
  /tmp/car_repair_audio.wav
make_video /tmp/car_repair_audio.wav "$OUTDIR/car_repair_guide.mp4" ""

echo "=== 2/5: tech_podcast (podcast, 60s, 2 speakers) ==="
# Speaker A (host) — Milena normal
gen_audio "\
Здравствуйте, уважаемые слушатели! В гостях сегодня доктор наук Алексей Соколов.
Алексей, расскажите, как нейросети меняют современную медицину?" \
  /tmp/podcast_a1.wav
gen_audio "\
Спасибо за приглашение. Нейросети уже сейчас используются для диагностики рака кожи
с точностью выше, чем у среднего дерматолога. Это не фантастика — это реальность 2026 года." \
  /tmp/podcast_b1.wav
# Speaker B (guest) — pitch-shifted
ffmpeg -y -i /tmp/podcast_b1.wav -af "asetrate=16000*0.85,atempo=1.176" /tmp/podcast_b1_pitch.wav 2>/dev/null
gen_audio "\
А как насчёт обработки медицинских снимков? Какие алгоритмы показывают лучшие результаты?" \
  /tmp/podcast_a2.wav
gen_audio "\
Свёрточные нейросети показывают точность 95 процентов при анализе КТ-снимков лёгких.
Крупные клиники уже внедряют такие системы в повседневную практику.
Рынок AI-диагностики растёт на 40 процентов в год." \
  /tmp/podcast_b2.wav
ffmpeg -y -i /tmp/podcast_b2.wav -af "asetrate=16000*0.85,atempo=1.176" /tmp/podcast_b2_pitch.wav 2>/dev/null
gen_audio "\
Какие ограничения сейчас есть у этой технологии?" \
  /tmp/podcast_a3.wav
gen_audio "\
Главная проблема — регуляторика. Не все страны готовы сертифицировать AI-диагностику.
Также важно качество размеченных данных — их сбор занимает до 80 процентов времени проекта." \
  /tmp/podcast_b3.wav
ffmpeg -y -i /tmp/podcast_b3.wav -af "asetrate=16000*0.85,atempo=1.176" /tmp/podcast_b3_pitch.wav 2>/dev/null

# Build interleaved audio
ffmpeg -y \
  -i /tmp/podcast_a1.wav -i /tmp/podcast_b1_pitch.wav \
  -i /tmp/podcast_a2.wav -i /tmp/podcast_b2_pitch.wav \
  -i /tmp/podcast_a3.wav -i /tmp/podcast_b3_pitch.wav \
  -filter_complex "[0:a][1:a][2:a][3:a][4:a][5:a]concat=n=6:v=0:a=1" \
  /tmp/podcast_audio.wav 2>/dev/null
make_video /tmp/podcast_audio.wav "$OUTDIR/tech_podcast.mp4" ""

echo "=== 3/5: smartphone_review (review, 45s) ==="
gen_audio "\
Сегодня на обзоре — новый Google Pixel 9 Pro. Это один из самых интересных смартфонов этого года.
Начнём с камеры. Основной сенсор на 50 мегапикселей с оптической стабилизацией.
Качество съёмки в условиях низкого освещения превосходное.
Экран OLED на 120 герц — один из лучших на рынке.
Процессор Tensor G5 обеспечивает плавную работу даже в тяжёлых играх.
Автономность — около двух дней при умеренном использовании.
Цена кусается — от 899 долларов. Но за эти деньги вы получаете лучшую камеру на рынке.
Из минусов — медленная зарядка. Всего 30 ватт, в то время как конкуренты уже предлагают 100.
В целом — отличный выбор для энтузиастов фотографии." \
  /tmp/review_audio.wav
make_video /tmp/review_audio.wav "$OUTDIR/smartphone_review.mp4" \
  "drawtext=text='Google Pixel 9 Pro':x=100:y=100:fontsize=36:fontcolor=white:enable='between(t,0,10)',drawtext=text='899\$':x=100:y=200:fontsize=36:fontcolor=yellow:enable='between(t,30,35)'"

echo "=== 4/5: diy_with_text (diy, 45s, OCR) ==="
gen_audio "\
Сегодня сделаем красивую фоторамку из картона своими руками.
Это отличный подарок для близких. Вам понадобится: плотный картон, клей ПВА, ножницы,
линейка, простой карандаш и ваше фото.
Из картона вырезаем основу размером 20 на 30 сантиметров.
Затем делаем рамку шириной 5 сантиметров.
Склеиваем детали клеем ПВА. Даём высохнуть 15 минут.
Теперь можно украсить рамку стразами или лентами.
Вставляем фото и вешаем на стену.
Простая и красивая поделка за 30 минут!" \
  /tmp/diy_audio.wav
make_video /tmp/diy_audio.wav "$OUTDIR/diy_with_text.mp4" \
  "drawtext=text='КАРТОН':x=200:y=100:fontsize=48:fontcolor=red:enable='between(t,5,15)',drawtext=text='КЛЕЙ ПВА':x=200:y=200:fontsize=48:fontcolor=blue:enable='between(t,15,25)',drawtext=text='НОЖНИЦЫ':x=200:y=300:fontsize=48:fontcolor=green:enable='between(t,25,40)'"

echo "=== 5/5: minecraft_stream (stream, 30s) ==="
gen_audio "\
Ого, ребята, вы не поверите! Я только что нашёл алмазы на 12 уровне!
Три блока алмазной руды сразу! Это невероятный улов!
Сейчас быстро переплавлю в печи и сделаю алмазную кирку.
Смотрите, какая красивая текстура. Теперь я могу добывать обсидиан.
Следующий шаг — портал в Нижний мир. Надевайте алмазную броню, будет жарко!
Не забывайте ставить факелы, чтобы мобы не спавнились рядом." \
  /tmp/stream_audio.wav
make_video /tmp/stream_audio.wav "$OUTDIR/minecraft_stream.mp4" ""

# Cleanup
rm -f /tmp/car_repair_audio.wav /tmp/podcast_*.wav /tmp/review_audio.wav /tmp/diy_audio.wav /tmp/stream_audio.wav

echo ""
echo "=== Done ==="
ls -lh "$OUTDIR"/*.mp4
