"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface ManageTeamFormProps {
  onTeamCreated: () => void;
}

export default function ManageTeamForm({ onTeamCreated }: ManageTeamFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    team_name: "Team 1",
    head_coach: "Coach 1",
    age: "11",
    season: "2025",
    session: "Summer",
    created_on: new Date().toISOString().split("T")[0],
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [teamNumber, setTeamNumber] = useState<number | null>(null)

  const fetchNextTeamNumber = async () => {
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/max_team_number`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("Failed to fetch team number")
      }
      
      const data = await response.json()
      setTeamNumber(data.next_team_number)
    } catch (error) {
      setError("Failed to fetch team number")
    }
  } 
  useEffect(() => {
    fetchNextTeamNumber()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setTeamNumber(null)
  
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/create_team/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to create team")
      }

      setSuccess(true)
      await fetchNextTeamNumber()
      // Reset form after successful submission
      setFormData({
        team_name: "",
        head_coach: "",
        age: "",
        season: "",
        session: "spring",
        created_on: new Date().toISOString().split("T")[0],
      })
    } catch (error) {  // Use the error
      console.error("An error occurred:", error);  // Actually use the error
  }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: name === "age" ? Number.parseInt(value) || "" : value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="team_name" className="block text-sm font-medium text-gray-700">
          Team Name
        </label>
        <input
          type="text"
          id="team_name"
          name="team_name"
          value={formData.team_name}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white"
        />
      </div>
      <div>
        <label htmlFor="head_coach" className="block text-sm font-medium text-gray-700">
          Head Coach
        </label>
        <input
          type="text"
          id="head_coach"
          name="head_coach"
          value={formData.head_coach}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white"
        />
      </div>
      <div>
        <label htmlFor="age" className="block text-sm font-medium text-gray-700">
          Age
        </label>
        <input
          type="number"
          id="age"
          name="age"
          value={formData.age}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white"
        />
      </div>
      <div>
        <label htmlFor="season" className="block text-sm font-medium text-gray-700">
          Season
        </label>
        <input
          type="text"
          id="season"
          name="season"
          value={formData.season}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white"
        />
      </div>
      <div>
        <label htmlFor="session" className="block text-sm font-medium text-gray-700">
          Session
        </label>
        <select
          id="session"
          name="session"
          value={formData.session}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white"
        >
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
          <option value="fall">Fall</option>
          <option value="winter">Winter</option>
        </select>
      </div>
      <div>
        <label htmlFor="created_on" className="block text-sm font-medium text-gray-700">
          Created On
        </label>
        <input
          type="date"
          id="created_on"
          name="created_on"
          value={formData.created_on}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white"
        />
      </div>
  
  <div className="flex space-x-4 items-end">
    <div className="flex-grow">
      <label htmlFor="next_team_number" className="block text-sm font-medium text-gray-700">
        Next Team Number
      </label>
      <input
        type="text"
        id="next_team_number"
        name="next_team_number"
        value={teamNumber || ""}
        readOnly
        className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
      />
    </div>
    <button
      type="button"
      onClick={fetchNextTeamNumber}
      className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      Get Next Number
    </button>
  </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-500 text-sm">Team created successfully!</p>}
      <div className="flex flex-col space-y-4">
        <button
          type="submit"
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Create Team
        </button>
        {success && (
          <button
            type="button"
            onClick={() => router.push("/create-roster")}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Create Roster
          </button>
        )}
      </div>
    </form>
  )
}

