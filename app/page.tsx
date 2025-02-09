import Link from "next/link"

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
        Digital Scorekeeper
      </h1>
      <p className="text-xl mb-12 text-gray-800 leading-relaxed max-w-3xl mx-auto">
        Quickly manage teams involved with games and score games accurately in a modern and intuitive platform
      </p>
      <div className="space-y-4 sm:space-y-0 sm:space-x-6 flex flex-col sm:flex-row justify-center">
        <Link
          href="/manage-team"
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-full hover:shadow-lg transition-all duration-300 hover:scale-105 inline-block"
        >
          Manage Team
        </Link>
        <Link
          href="/score-game"
          className="bg-gradient-to-r from-teal-400 to-cyan-500 text-white px-8 py-3 rounded-full hover:shadow-lg transition-all duration-300 hover:scale-105 inline-block"
        >
          Score a Game
        </Link>
      </div>
    </div>
  )
}

