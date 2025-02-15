"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { Fragment } from "react"

interface AddPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPlayer: (playerData: any) => void
  existingJerseyNumbers?: string[]
}

const defensivePositions = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"]

export default function AddPlayerModal({ isOpen, onClose, onAddPlayer, existingJerseyNumbers }: AddPlayerModalProps) {
  const [playerData, setPlayerData] = useState({
    player_name: "",
    jersey_number: "",
    active: "Y",
    defensive_position_one: "P",
    defensive_position_two: "",
    defensive_position_three: "",
    defensive_position_allocation_one: "",
    defensive_position_allocation_two: "",
    defensive_position_allocation_three: "",
  })

  const [error, setError] = useState("")
  const [totalAllocation, setTotalAllocation] = useState(0)

  useEffect(() => {
    const allocations = [
      Number.parseFloat(playerData.defensive_position_allocation_one) || 0,
      Number.parseFloat(playerData.defensive_position_allocation_two) || 0,
      Number.parseFloat(playerData.defensive_position_allocation_three) || 0,
    ]
    setTotalAllocation(allocations.reduce((sum, a) => sum + a, 0))
  }, [
    playerData.defensive_position_allocation_one,
    playerData.defensive_position_allocation_two,
    playerData.defensive_position_allocation_three,
  ])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setPlayerData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    if (!playerData.player_name || !playerData.jersey_number) {
      setError("Player name and jersey number are required")
      return false
    }

    if (existingJerseyNumbers && existingJerseyNumbers.includes(playerData.jersey_number)) {
      setError("This jersey number is already in use")
      return false
    }

    if (Math.abs(totalAllocation - 1) > 0.001 && totalAllocation !== 0) {
      setError("The sum of all allocations must equal 1 (100%) or be 0")
      return false
    }

    setError("")
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      const filteredPlayerData = {
        ...playerData,
        defensive_position_two: playerData.defensive_position_two || null,
        defensive_position_three: playerData.defensive_position_three || null,
        defensive_position_allocation_two: playerData.defensive_position_allocation_two || null,
        defensive_position_allocation_three: playerData.defensive_position_allocation_three || null,
        active: playerData.active === "Y" ? "true" : "false", // Convert Y/N to true/false
      }
      onAddPlayer(filteredPlayerData)
      setPlayerData({
        player_name: "",
        jersey_number: "",
        active: "Y",
        defensive_position_one: "P",
        defensive_position_two: "",
        defensive_position_three: "",
        defensive_position_allocation_one: "",
        defensive_position_allocation_two: "",
        defensive_position_allocation_three: "",
      })
      onClose()
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Add New Player
                </Dialog.Title>
                <form onSubmit={handleSubmit} className="mt-2 space-y-4">
                  <div>
                    <label htmlFor="player_name" className="block text-sm font-medium text-gray-700">
                      Player Name
                    </label>
                    <input
                      type="text"
                      id="player_name"
                      name="player_name"
                      value={playerData.player_name}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                  <div>
                    <label htmlFor="jersey_number" className="block text-sm font-medium text-gray-700">
                      Jersey Number
                    </label>
                    <input
                      type="text"
                      id="jersey_number"
                      name="jersey_number"
                      value={playerData.jersey_number}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                  <div>
                    <label htmlFor="active" className="block text-sm font-medium text-gray-700">
                      Active
                    </label>
                    <select
                      id="active"
                      name="active"
                      value={playerData.active}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    >
                      <option value="Y">Yes</option>
                      <option value="N">No</option>
                    </select>
                  </div>
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="space-y-2">
                      <div>
                        <label
                          htmlFor={`defensive_position_${num}`}
                          className="block text-sm font-medium text-gray-700"
                        >
                          Defensive Position {num}
                        </label>
                        <select
                          id={`defensive_position_${num}`}
                          name={`defensive_position_${num === 1 ? "one" : num === 2 ? "two" : "three"}`}
                          value={playerData[`defensive_position_${num === 1 ? "one" : num === 2 ? "two" : "three"}`]}
                          onChange={handleChange}
                          disabled={num !== 1 && totalAllocation >= 1}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        >
                          <option value="">Select a position</option>
                          {defensivePositions.map((pos) => (
                            <option key={pos} value={pos}>
                              {pos}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor={`defensive_position_allocation_${num}`}
                          className="block text-sm font-medium text-gray-700"
                        >
                          Position {num} Allocation
                        </label>
                        <input
                          type="number"
                          id={`defensive_position_allocation_${num}`}
                          name={`defensive_position_allocation_${num === 1 ? "one" : num === 2 ? "two" : "three"}`}
                          value={
                            playerData[
                              `defensive_position_allocation_${num === 1 ? "one" : num === 2 ? "two" : "three"}`
                            ]
                          }
                          onChange={handleChange}
                          min="0"
                          max={
                            1 -
                            (totalAllocation -
                              (Number.parseFloat(
                                playerData[
                                  `defensive_position_allocation_${num === 1 ? "one" : num === 2 ? "two" : "three"}`
                                ],
                              ) || 0))
                          }
                          step="0.01"
                          disabled={num !== 1 && totalAllocation >= 1}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="text-sm font-medium text-gray-700">
                    Total Allocation: {totalAllocation.toFixed(2)}
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      Add Player
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

