"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Play, Camera } from "lucide-react";

const instagramPosts = [
  {
    id: "post-1",
    title: "Optical Lens Prototype Testing",
    category: "R&D LAB",
    image: "/images/instagram_1.jpg",
  },
  {
    id: "post-2",
    title: "Precision Machining & Assembly",
    category: "MANUFACTURING",
    image: "/images/instagram_2.jpg",
  },
  {
    id: "post-3",
    title: "Bonsai Tree Projection in Living Room",
    category: "IN SITU",
    image: "/images/instagram_3.jpg",
  },
];

export default function InstagramSection() {
  return (
    <section className="bg-[#0B0B0C] text-white py-20 lg:py-28 border-b border-[#242426]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-[#242426]">
          <div>
            <span className="text-xs font-mono text-[#C8FF35] tracking-[0.3em] uppercase block mb-1">
              THE BEHIND-THE-SCENES CHRONICLES
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight uppercase">
              BUILDING DAXUL LABS
            </h2>
            <p className="text-xs sm:text-sm text-[#B9B9B4] mt-2">
              Follow the journey from our first machine to our first products.
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            <Link
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#151515] hover:bg-[#242426] border border-[#242426] hover:border-[#C8FF35] px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider text-white transition-all duration-300"
            >
              <Camera className="w-4 h-4 text-[#C8FF35]" />
              <span>@daxul.labs</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#B9B9B4]" />
            </Link>
          </div>
        </div>

        {/* 3 Reel / Journey Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {instagramPosts.map((post) => (
            <div
              key={post.id}
              className="group relative rounded-2xl overflow-hidden bg-[#151515] border border-[#242426] aspect-square flex flex-col justify-between p-6 transition-all duration-500 hover:border-[#C8FF35]/50"
            >
              {/* Background Image */}
              <Image
                src={post.image}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0C] via-[#0B0B0C]/40 to-transparent opacity-80 group-hover:opacity-70 transition-opacity" />

              {/* Top Tag & Play Badge */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest text-[#C8FF35] bg-[#0B0B0C]/80 px-2.5 py-1 rounded border border-[#242426]">
                  {post.category}
                </span>

                <div className="w-8 h-8 rounded-full bg-[#0B0B0C]/80 border border-[#242426] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5 text-[#C8FF35]" />
                </div>
              </div>

              {/* Bottom Details */}
              <div className="relative z-10">
                <h4 className="text-base font-bold text-white tracking-wide group-hover:text-[#C8FF35] transition-colors">
                  {post.title}
                </h4>
                <span className="text-[11px] font-mono text-[#B9B9B4] mt-1 block">
                  Watch Process Reel →
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
