import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearToken,
  getToken,
  initAuth,
  isAuthenticated,
  setToken,
  TOKEN_KEY,
} from "../useAuth"

describe("useAuth", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal("location", {
      ...window.location,
      search: "",
      pathname: "/",
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  describe("isAuthenticated", () => {
    it("returns false when no token is stored", () => {
      expect(isAuthenticated()).toBe(false)
    })

    it("returns true when token exists in localStorage", () => {
      localStorage.setItem(TOKEN_KEY, "test-token")
      expect(isAuthenticated()).toBe(true)
    })
  })

  describe("getToken", () => {
    it("returns null when no token is stored", () => {
      expect(getToken()).toBeNull()
    })

    it("returns the stored token", () => {
      localStorage.setItem(TOKEN_KEY, "my-jwt-token")
      expect(getToken()).toBe("my-jwt-token")
    })
  })

  describe("setToken", () => {
    it("stores the token in localStorage", () => {
      setToken("new-token")
      expect(localStorage.getItem(TOKEN_KEY)).toBe("new-token")
    })

    it("overwrites an existing token", () => {
      setToken("first-token")
      setToken("second-token")
      expect(localStorage.getItem(TOKEN_KEY)).toBe("second-token")
    })
  })

  describe("clearToken", () => {
    it("removes the token from localStorage", () => {
      localStorage.setItem(TOKEN_KEY, "token-to-remove")
      clearToken()
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    })

    it("does not throw when no token exists", () => {
      expect(() => clearToken()).not.toThrow()
    })
  })

  describe("initAuth", () => {
    it("extracts token from URL search params and stores it", () => {
      const replaceStateSpy = vi.fn()
      vi.stubGlobal("location", {
        search: "?token=url-token-123",
        pathname: "/dashboard",
      })
      vi.spyOn(window.history, "replaceState").mockImplementation(
        replaceStateSpy,
      )

      initAuth()

      expect(getToken()).toBe("url-token-123")
      expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/dashboard")
    })

    it("preserves other query params when extracting token", () => {
      const replaceStateSpy = vi.fn()
      vi.stubGlobal("location", {
        search: "?token=url-token&page=2&sort=name",
        pathname: "/list",
      })
      vi.spyOn(window.history, "replaceState").mockImplementation(
        replaceStateSpy,
      )

      initAuth()

      expect(getToken()).toBe("url-token")
      expect(replaceStateSpy).toHaveBeenCalledWith(
        {},
        "",
        "/list?page=2&sort=name",
      )
    })

    it("does not modify URL when no token param is present", () => {
      const replaceStateSpy = vi.fn()
      vi.spyOn(window.history, "replaceState").mockImplementation(
        replaceStateSpy,
      )

      initAuth()

      expect(replaceStateSpy).not.toHaveBeenCalled()
    })
  })
})
