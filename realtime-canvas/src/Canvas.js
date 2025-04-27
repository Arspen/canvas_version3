// Canvas.js (FULL FILE VERSION, corrected for Create-React-App)

import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import labelMap from './labelMap.json';

const socket = io('https://canvas-version3.onrender.com'); // <-- your backend URL here

const Canvas = () => {
  const canvasRef = useRef(null);
  const [currentWord, setCurrentWord] = useState('');
  const [userId, setUserId] = useState('');
  const [placements, setPlacements] = useState([]);
  const [pendingWord, setPendingWord] = useState(null);
  const [imageCache, setImageCache] = useState({});
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = `/icons/${placement.emoji}`;
      img.onerror = () => {
      console.error(`Failed to load image: ${placement.emoji}`);
      img.src = `/icons/Placeholder.png`; // or any default fallback
      };

      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });
  };

  useEffect(() => {
    const preloadImages = async () => {
      const cache = {};
      const allIcons = [
        "Ant.png", "Baby.png", "Badger.png", "Bat.png", "Beach.png", "Beaver.png", "Bee.png", "Beluga.png", "Bike.png", "Bird.png", "Bison.png", "Black_Cat.png", "Boar.png", "Boat.png", "Books.png", "Box.png", "Brush.png", "Buffalo.png", "Building.png", "Bull.png", "Bunny.png", "Bus.png", "Butterfly.png", "Cactus.png", "Cake.png", "Camel.png", "Camera.png", "Candle.png", "Car.png", "Castle.png", "Cat.png", "Caterpillar.png", "Chair.png", "Chicken.png", "Church.png", "Circus.png", "City.png", "Coffee.png", "Coffee_Machine.png", "Coffee_Shop.png", "Computer.png", "Construction.png", "Coral.png", "Cow.png", "Crab.png", "Cricket.png", "Crocodile.png", "Crow.png", "Cup.png", "Deep_Water.png", "Deer.png", "Direction_Board.png", "Dodo.png", "Dog.png", "Dolphin.png", "Donkey.png", "Dragon.png", "Drink.png", "Duck.png", "Eagle.png", "Elephant.png", "Factory.png", "Family.png", "Ferris_Wheel.png", "Film_Camera.png", "Fish.png", "Flamingo.png", "Flan.png", "Flower-Pink.png", "Flower-Yellow.png", "Fly.png", "Game.png", "Giraffe.png", "Goat.png", "Gorilla.png", "Grass.png", "Guitar.png", "Headphones.png", "Hedgehog.png", "Helicopter.png", "Help_Dog.png", "Hippopotamus.png", "Horse.png", "Hospital.png", "Hotel.png", "House.png", "Human_Acrobatics.png", "Human_Cycling.png", "Human_Dance.png", "Human_Golf.png", "Human_HorseRiding.png", "Human_Kanoe.png", "Human_Left.png", "Human_Meditation.png", "Human-Play.png", "Human_Right.png", "Human_Running.png", "Human_Sit_Left.png", "Human_Sit_Right.png", "Human_Snowboard.png", "Human_Surfing.png", "Human_Swimming.png", "Human_Tricks.png", "Human_Workout.png", "Human-Ski.png", "Human-Windsurf.png", "Hut.png", "Industry.png", "Island.png", "Jeep.png", "Kangaroo.png", "Kanoe.png", "Koala.png", "Ladder.png", "Lady_Bug.png", "Latte.png", "Leopard.png", "Lizard.png", "Llama.png", "Lobster.png", "Macaque.png", "Mail_Box.png", "Mammoth.png", "Man.png", "Map.png", "Microscope.png", "Money.png", "Monument.png", "Mosque.png", "Mosquito.png", "Motorbike.png", "Mountain.png", "Mouse.png", "Mushroom.png", "Narwhal.png", "Nuclear_Power.png", "Octopus.png", "Orangutan.png", "Orca.png", "Otter.png", "Owl.png", "Paint.png", "Painting.png", "Palm.png", "Parasol.png", "Parrot.png", "Peacock.png", "Penguin.png", "Phone_Booth.png", "Pickup_Truck.png", "Pig.png", "Pigeon.png", "Piñata.png", "Pine.png", "Plane.png", "Plant.png", "Polar_Bear.png", "Poodle.png", "Present.png", "Puzzle.png", "Pyramid.png", "Racoon.png", "Ram.png", "Rat.png", "Reindeer.png", "Relationship.png", "Rescue_Dog.png", "Rhinoceros.png", "Rock.png", "Rocket.png", "Rose.png", "Sail_Boat.png", "Sand.png", "School.png", "Scorpion.png", "Sculpture.png", "Seal.png", "Shark.png", "Sheep.png", "Shrimp.png", "Skateboard.png", "Skunk.png", "Slide.png", "Sloth.png", "Snail.png", "Snake.png", "Soil.png", "Solar_Panel.png", "Space_Ship.png", "Squid.png", "Squirrel.png", "Station.png", "Step.png", "Suitcase.png", "Swan.png", "Synagogue.png", "Table_Chair.png", "Tea.png", "Telescope.png", "Temple.png", "Tent.png", "Tiger.png", "Tower.png", "Tractor.png", "Train.png", "Tram.png", "Tree.png", "T-Rex.png", "Trompet.png", "Truck.png", "Turkey.png", "Turtle.png", "Unicorn.png", "Vase.png", "Vine.png", "Violin.png", "Volcano.png", "Water.png", "Water_Lily.png", "Whale.png", "Windmill.png", "Woman.png", "Woman_Dance.png", "Worm.png", "Zebra.png"
      ];

      await Promise.all(
        allIcons.map(async (filename) => {
          const img = await loadImage(`/icons/${filename}`);
          cache[filename] = img;
        })
      );

      setImageCache(cache);
      setImagesLoaded(true);
    };

    preloadImages();
  }, []);

  useEffect(() => {
    socket.on('initialPlacements', (data) => {
      setPlacements(data);
    });

    socket.on('placeEmoji', (data) => {
      setPlacements(prev => [...prev, data]);
    });

    return () => {
      socket.off('initialPlacements');
      socket.off('placeEmoji');
    };
  }, []);

  const handleCanvasClick = (e) => {
    if (!pendingWord || !userId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let mappedEmoji = pendingWord;
    for (const key in labelMap) {
      if (labelMap[key].synonyms.includes(pendingWord.toLowerCase())) {
        mappedEmoji = labelMap[key].emoji;
        break;
      }
    }

    socket.emit('placeEmoji', { word: pendingWord, emoji: mappedEmoji, x, y, userId });
    setPendingWord(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || !imagesLoaded) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    placements.forEach(({ word, emoji, x, y }) => {
      const image = imageCache[emoji];
      if (image) {
        ctx.drawImage(image, x - 25, y - 25, 50, 50);
      } else {
        ctx.fillText(word, x, y);
      }
    });

    if (pendingWord) {
      canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        placements.forEach(({ word, emoji, x, y }) => {
          const image = imageCache[emoji];
          if (image) {
            ctx.drawImage(image, x - 25, y - 25, 50, 50);
          } else {
            ctx.fillText(word, x, y);
          }
        });

        ctx.globalAlpha = 0.5;
        ctx.fillText(pendingWord, x, y);
        ctx.globalAlpha = 1;
      };
    } else {
      canvas.onmousemove = null;
    }
  }, [placements, pendingWord, imagesLoaded, imageCache]);

  if (!userId) {
    const inputId = prompt("Enter your username:");
    if (inputId) setUserId(inputId);
  }

  return (
    <div>
      <h1>Welcome, {userId}</h1>
      <input
        type="text"
        value={currentWord}
        onChange={(e) => setCurrentWord(e.target.value)}
        placeholder="Type a word..."
      />
      <button onClick={() => {
        if (currentWord) setPendingWord(currentWord);
      }}>Confirm</button>
      <canvas
        ref={canvasRef}
        width={2000}
        height={1200}
        onClick={handleCanvasClick}
        style={{ border: '1px solid black', marginTop: '10px' }}
      />
    </div>
  );
};

export default Canvas;