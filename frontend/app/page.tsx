"use client";

import dynamic from "next/dynamic";
import Head from "next/head";
import React from 'react';

const RadarMap = dynamic(() => import("@/components/RadarMap"), { ssr: false });

export default function Home() {
  return (
    <>
      <Head>
        <title>Radar & Snow Viewer</title>
      </Head>
      <main className="w-full h-screen flex flex-col bg-gray-900">
        <div className="flex flex-1">
          <RadarMap />
        </div>
      </main>
    </>
  );
}
