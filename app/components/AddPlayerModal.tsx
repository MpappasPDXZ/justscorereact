"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { Fragment } from "react"
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline"

interface AddPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPlayer: (playerData: any) => void
  existingJerseyNumbers?: string[]
  isEditing?: boolean
  initialData?: PlayerData | null
  title?: string
}

const defensivePositions = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"]
const DEFENSIVE_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const;

export interface PlayerData {
  player_name: string
  jersey_number: string
  active: "Active" | "Inactive"
  defensive_position_one: string
  defensive_position_two: string
  defensive_position_three: string
  defensive_position_four: string
  defensive_position_allocation_one: string
  defensive_position_allocation_two: string
  defensive_position_allocation_three: string
  defensive_position_allocation_four: string
}

export default function AddPlayerModal({ 
  isOpen, 
  onClose, 
  onAddPlayer, 
  existingJerseyNumbers,
  isEditing = false,
  initialData = null,
  title = "Add New Player"
}: AddPlayerModalProps) {
  const [playerData, setPlayerData] = useState<PlayerData>({
    player_name: "",
    jersey_number: "",
    active: "Active",
    defensive_position_one: "P",
    defensive_position_two: "",
    defensive_position_three: "",
    defensive_position_four: "",
    defensive_position_allocation_one: "1.00",
    defensive_position_allocation_two: "",
    defensive_position_allocation_three: "",
    defensive_position_allocation_four: "",
  })

  const [error, setError] = useState("")
  const [totalAllocation, setTotalAllocation] = useState(0)

  useEffect(() => {
    const allocations = [
      Number.parseFloat(playerData.defensive_position_allocation_one || '0'),
      Number.parseFloat(playerData.defensive_position_allocation_two || '0'),
      Number.parseFloat(playerData.defensive_position_allocation_three || '0'),
      Number.parseFloat(playerData.defensive_position_allocation_four || '0'),
    ]
    setTotalAllocation(allocations.reduce((sum, a) => sum + a, 0))
  }, [
    playerData.defensive_position_allocation_one,
    playerData.defensive_position_allocation_two,
    playerData.defensive_position_allocation_three,
    playerData.defensive_position_allocation_four,
  ])

  useEffect(() => {
    if (isOpen && isEditing && initialData) {
      setPlayerData(initialData)
    }
  }, [isOpen, isEditing, initialData])

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

    if (Math.abs(totalAllocation - 1) > 0.001) {
      setError("The sum of all position allocations must equal 1 (100%)")
      return false
    }

    setError("")
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onAddPlayer(playerData)
      setPlayerData({
        player_name: "",
        jersey_number: "",
        active: "Active",
        defensive_position_one: "P",
        defensive_position_two: "",
        defensive_position_three: "",
        defensive_position_four: "",
        defensive_position_allocation_one: "1.00",
        defensive_position_allocation_two: "",
        defensive_position_allocation_three: "",
        defensive_position_allocation_four: "",
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
                  {title}
                </Dialog.Title>
                <form onSubmit={handleSubmit} className="mt-2 space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Player Name</label>
                        <input
                          type="text"
                          name="player_name"
                          value={playerData.player_name}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Jersey Number</label>
                        <input
                          type="text"
                          name="jersey_number"
                          value={playerData.jersey_number}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        name="active"
                        value={playerData.active}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Defensive Positions</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Position 1</label>
                          <div className="flex items-center space-x-2">
                            <div className="w-20">
                              <select
                                name="defensive_position_one"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                required
                                value={playerData.defensive_position_one}
                                onChange={handleChange}
                              >
                                {DEFENSIVE_POSITIONS.map(pos => (
                                  <option key={pos} value={pos}>{pos}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1">
                              <input
                                type="number"
                                name="defensive_position_allocation_one"
                                placeholder="0.0"
                                step="0.01"
                                min="0"
                                max="1"
                                value={playerData.defensive_position_allocation_one}
                                onChange={handleChange}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                required
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Position 2</label>
                          <div className="flex items-center space-x-2">
                            <div className="w-20">
                              <select
                                name="defensive_position_two"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={playerData.defensive_position_two}
                                onChange={handleChange}
                              >
                                <option value="">-</option>
                                {DEFENSIVE_POSITIONS.map(pos => (
                                  <option key={pos} value={pos}>{pos}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1">
                              <input
                                type="number"
                                name="defensive_position_allocation_two"
                                placeholder="0.0"
                                step="0.01"
                                min="0"
                                max="1"
                                value={playerData.defensive_position_allocation_two}
                                onChange={handleChange}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Position 3</label>
                          <div className="flex items-center space-x-2">
                            <div className="w-20">
                              <select
                                name="defensive_position_three"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={playerData.defensive_position_three}
                                onChange={handleChange}
                              >
                                <option value="">-</option>
                                {DEFENSIVE_POSITIONS.map(pos => (
                                  <option key={pos} value={pos}>{pos}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1">
                              <input
                                type="number"
                                name="defensive_position_allocation_three"
                                placeholder="0.0"
                                step="0.01"
                                min="0"
                                max="1"
                                value={playerData.defensive_position_allocation_three}
                                onChange={handleChange}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Position 4</label>
                          <div className="flex items-center space-x-2">
                            <div className="w-20">
                              <select
                                name="defensive_position_four"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={playerData.defensive_position_four}
                                onChange={handleChange}
                              >
                                <option value="">-</option>
                                {DEFENSIVE_POSITIONS.map(pos => (
                                  <option key={pos} value={pos}>{pos}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1">
                              <input
                                type="number"
                                name="defensive_position_allocation_four"
                                placeholder="0.0"
                                step="0.01"
                                min="0"
                                max="1"
                                value={playerData.defensive_position_allocation_four}
                                onChange={handleChange}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-medium text-gray-700">
                      Total Allocation: {totalAllocation.toFixed(2)}
                    </div>
                    {Math.abs(totalAllocation - 1) > 0.001 && totalAllocation !== 0 && (
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" title="Total allocation should equal 1.00" />
                    )}
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
                      {isEditing ? "Save Edits" : "Add Player"}
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

