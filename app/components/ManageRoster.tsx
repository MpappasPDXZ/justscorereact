"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ManageRoster({ params }: { params: { teamId: string } }) {
  const router = useRouter()
  const [roster, setRoster] = useState([])
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${params.teamId}/roster`)
        if (!response.ok) {
          throw new Error("Failed to fetch roster")
        }
        const data = await response.json()
        setRoster(data)
      } catch (error) {
        setError("Failed to fetch roster")
      }
    }

    fetchRoster()
  }, [params.teamId])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Team Roster</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <table className="min-w-full bg-white">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-6 py-3 border-b border-gray-200 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 border-b border-gray-200 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
              Jersey Number
            </th>
            {/* Add other headers as needed */}
          </tr>
        </thead>
        <tbody>
          {roster.map((player) => (
            <tr key={player.jersey_number} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-no-wrap border-b border-gray-200">
                {player.name}
              </td>
              <td className="px-6 py-4 whitespace-no-wrap border-b border-gray-200">
                {player.jersey_number}
              </td>
              {/* Add other player data cells as needed */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}